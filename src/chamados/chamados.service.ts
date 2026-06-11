import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AutorMensagem, StatusChamado, TipoUsuario, UsuarioToken } from '../common/enums';
import { Chamado } from '../entities/chamado.entity';
import { Mensagem } from '../entities/mensagem.entity';
import { Usuario } from '../entities/usuario.entity';
import { RmService } from '../integracao/rm.service';
import { AbrirChamadoDto, MensagemDto } from './chamados.dto';
import { ChatGateway } from './chat.gateway';

const RESOLVIDO = [StatusChamado.APROVADO, StatusChamado.RECUSADO];
const horaAgora = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

@Injectable()
export class ChamadosService {
  constructor(
    @InjectRepository(Chamado) private readonly chamados: Repository<Chamado>,
    @InjectRepository(Mensagem) private readonly mensagens: Repository<Mensagem>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly rm: RmService,
    private readonly chat: ChatGateway,
  ) {}

  private async gerarProtocolo(): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const p = String(Math.floor(10_000_000 + Math.random() * 89_999_999));
      if (!(await this.chamados.findOne({ where: { protocolo: p } }))) return p;
    }
    return String(Date.now()).slice(-8);
  }

  private async addSistema(chamadoId: string, texto: string) {
    const m = await this.mensagens.save(
      this.mensagens.create({
        chamadoId,
        autor: AutorMensagem.SISTEMA,
        texto,
        horario: horaAgora(),
      }),
    );
    this.chat.emitirMensagem(chamadoId, m);
    return m;
  }

  /** Colaborador abre um chamado de justificativa. */
  async abrir(user: UsuarioToken, dto: AbrirChamadoDto) {
    if (user.tipo !== TipoUsuario.COLABORADOR) {
      throw new ForbiddenException('Apenas colaboradores abrem chamados.');
    }
    const protocolo = await this.gerarProtocolo();
    const chamado = await this.chamados.save(
      this.chamados.create({
        protocolo,
        colaboradorId: user.sub,
        categoria: dto.categoria,
        status: StatusChamado.PENDENTE,
        dataOcorrencia: dto.dataOcorrencia,
        horarioOriginal: dto.horarioOriginal ?? null,
        horarioProposto: dto.horarioProposto ?? null,
        descricao: dto.descricao ?? null,
      }),
    );
    await this.addSistema(chamado.id, `Protocolo ${protocolo} — Atendimento solicitado`);
    const completo = await this.detalhe(chamado.id, user);
    this.chat.emitirNovoChamado(completo);
    return completo;
  }

  /** Console do atendente: filas separadas. Colaborador: os próprios chamados. */
  async listar(user: UsuarioToken) {
    if (user.tipo === TipoUsuario.COLABORADOR) {
      const meus = await this.chamados.find({
        where: { colaboradorId: user.sub },
        order: { criadoEm: 'DESC' },
      });
      return { meus };
    }
    const supervisor = user.papel === 'SUPERVISOR';
    const todos = await this.chamados.find({ order: { criadoEm: 'DESC' } });
    const meu = (c: Chamado) => supervisor || c.atendenteId === user.sub;
    return {
      emEspera: todos
        .filter((c) => c.status === StatusChamado.PENDENTE)
        .sort((a, b) => +a.criadoEm - +b.criadoEm),
      emAtendimento: todos.filter((c) => c.status === StatusChamado.EM_ATENDIMENTO && meu(c)),
      encerrados: todos.filter((c) => RESOLVIDO.includes(c.status) && meu(c)),
    };
  }

  async detalhe(id: string, user: UsuarioToken) {
    const chamado = await this.chamados.findOne({ where: { id } });
    if (!chamado) throw new NotFoundException('Chamado não encontrado.');
    if (user.tipo === TipoUsuario.COLABORADOR && chamado.colaboradorId !== user.sub) {
      throw new ForbiddenException('Sem acesso a este chamado.');
    }
    const mensagens = await this.mensagens.find({
      where: { chamadoId: id },
      order: { criadoEm: 'ASC' },
    });
    return { ...chamado, mensagens };
  }

  async enviarMensagem(id: string, user: UsuarioToken, dto: MensagemDto) {
    const chamado = await this.chamados.findOne({ where: { id } });
    if (!chamado) throw new NotFoundException('Chamado não encontrado.');
    if (!dto.texto?.trim() && !dto.anexoNome) {
      throw new BadRequestException('Mensagem vazia.');
    }
    if (user.tipo === TipoUsuario.COLABORADOR && chamado.colaboradorId !== user.sub) {
      throw new ForbiddenException('Sem acesso a este chamado.');
    }

    // Atendente respondendo um chamado em espera assume o atendimento.
    if (user.tipo === TipoUsuario.ATENDENTE && chamado.status === StatusChamado.PENDENTE) {
      chamado.status = StatusChamado.EM_ATENDIMENTO;
      chamado.atendenteId = user.sub;
      await this.chamados.save(chamado);
      await this.addSistema(id, `Protocolo ${chamado.protocolo} — Atendimento iniciado por ${user.nome}`);
    }

    const m = await this.mensagens.save(
      this.mensagens.create({
        chamadoId: id,
        autor: user.tipo === TipoUsuario.COLABORADOR ? AutorMensagem.COLABORADOR : AutorMensagem.ATENDENTE,
        texto: dto.texto?.trim() ?? '',
        horario: horaAgora(),
        anexoNome: dto.anexoNome ?? null,
        anexoEhImagem: dto.anexoEhImagem ?? null,
      }),
    );
    this.chat.emitirMensagem(id, m);
    return m;
  }

  async atender(id: string, user: UsuarioToken) {
    const chamado = await this.exigirAtendente(id, user);
    if (RESOLVIDO.includes(chamado.status)) throw new BadRequestException('Chamado já encerrado.');
    chamado.status = StatusChamado.EM_ATENDIMENTO;
    chamado.atendenteId = user.sub;
    await this.chamados.save(chamado);
    await this.addSistema(id, `Protocolo ${chamado.protocolo} — Atendimento iniciado por ${user.nome}`);
    this.chat.emitirAtualizacao(id);
    return this.detalhe(id, user);
  }

  async decidir(id: string, user: UsuarioToken, decisao: 'APROVADO' | 'RECUSADO', motivo?: string) {
    const chamado = await this.exigirAtendente(id, user);
    if (RESOLVIDO.includes(chamado.status)) throw new BadRequestException('Chamado já encerrado.');
    if (decisao === 'RECUSADO' && !motivo?.trim()) {
      throw new BadRequestException('Informe o motivo da recusa.');
    }

    if (decisao === 'APROVADO') {
      const colaborador = await this.usuarios.findOne({ where: { id: chamado.colaboradorId } });
      // Grava o ajuste na folha (RM Labore) via n8n antes de concluir.
      await this.rm.gravarAjuste({
        protocolo: chamado.protocolo,
        cpf: colaborador?.cpf ?? null,
        matricula: colaborador?.matricula ?? null,
        categoria: chamado.categoria,
        dataOcorrencia: chamado.dataOcorrencia,
        horarioOriginal: chamado.horarioOriginal,
        horarioProposto: chamado.horarioProposto,
      });
    }

    chamado.status = decisao === 'APROVADO' ? StatusChamado.APROVADO : StatusChamado.RECUSADO;
    chamado.atendenteId = user.sub;
    chamado.motivoRecusa = decisao === 'RECUSADO' ? motivo!.trim() : null;
    await this.chamados.save(chamado);
    const rotulo = decisao === 'APROVADO' ? 'Aprovado' : 'Recusado';
    await this.addSistema(id, `Protocolo ${chamado.protocolo} — Atendimento finalizado por ${user.nome} (${rotulo})`);
    this.chat.emitirAtualizacao(id);
    return this.detalhe(id, user);
  }

  async transferir(id: string, user: UsuarioToken, destinoId: string) {
    const chamado = await this.exigirAtendente(id, user);
    const destino = await this.usuarios.findOne({ where: { id: destinoId, tipo: TipoUsuario.ATENDENTE } });
    if (!destino) throw new NotFoundException('Atendente de destino não encontrado.');
    const anterior = chamado.atendenteId
      ? (await this.usuarios.findOne({ where: { id: chamado.atendenteId } }))?.nome
      : null;
    chamado.atendenteId = destino.id;
    if (chamado.status === StatusChamado.PENDENTE) chamado.status = StatusChamado.EM_ATENDIMENTO;
    await this.chamados.save(chamado);
    const txt = anterior
      ? `Protocolo ${chamado.protocolo} — Atendimento transferido de ${anterior} para ${destino.nome}`
      : `Protocolo ${chamado.protocolo} — Atendimento atribuído a ${destino.nome}`;
    await this.addSistema(id, txt);
    this.chat.emitirAtualizacao(id);
    return this.detalhe(id, user);
  }

  private async exigirAtendente(id: string, user: UsuarioToken): Promise<Chamado> {
    if (user.tipo !== TipoUsuario.ATENDENTE) throw new ForbiddenException('Ação exclusiva de atendentes.');
    const chamado = await this.chamados.findOne({ where: { id } });
    if (!chamado) throw new NotFoundException('Chamado não encontrado.');
    return chamado;
  }
}
