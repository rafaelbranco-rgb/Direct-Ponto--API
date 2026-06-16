import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';

import type { Config } from '../config/configuracao';
import { AutorMensagem, StatusChamado, TipoUsuario, UsuarioToken } from '../common/enums';
import { Chamado } from '../entities/chamado.entity';
import { Mensagem } from '../entities/mensagem.entity';
import { Usuario } from '../entities/usuario.entity';
import { RmService } from '../integracao/rm.service';
import { PushService } from '../push/push.service';
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
    private readonly push: PushService,
    private readonly config: ConfigService<Config, true>,
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
    this.chat.notificarAtendentes({
      tipo: 'chamado',
      chamadoId: chamado.id,
      protocolo,
      categoria: dto.categoria,
      de: user.nome,
    });
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
    // "Em atendimento"/"Encerrados" são SEMPRE pessoais (do atendente logado),
    // para qualquer papel — ao transferir, o chamado sai da lista de quem
    // transferiu e entra na do destino. O histórico completo fica na aba Histórico.
    const todos = await this.chamados.find({ order: { criadoEm: 'DESC' } });
    const meu = (c: Chamado) => c.atendenteId === user.sub;
    return {
      emEspera: todos
        .filter((c) => c.status === StatusChamado.PENDENTE)
        .sort((a, b) => +a.criadoEm - +b.criadoEm),
      emAtendimento: todos.filter((c) => c.status === StatusChamado.EM_ATENDIMENTO && meu(c)),
      encerrados: todos.filter((c) => RESOLVIDO.includes(c.status) && meu(c)),
    };
  }

  /** Histórico completo: TODOS os chamados (qualquer atendente) — igual para
   *  todas as contas de atendente/supervisor. Sem mensagens (vêm no detalhe). */
  async listarHistorico(user: UsuarioToken) {
    if (user.tipo !== TipoUsuario.ATENDENTE) {
      throw new ForbiddenException('Apenas atendentes acessam o histórico.');
    }
    return this.chamados.find({ order: { criadoEm: 'DESC' } });
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
    const chamado = await this.exigirAcesso(id, user);
    if (!dto.texto?.trim() && !dto.anexoNome) {
      throw new BadRequestException('Mensagem vazia.');
    }
    await this.assumirSePendente(chamado, user);
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
    await this.distribuir(chamado, m, user);
    return m;
  }

  /** Recebe um arquivo enviado pelo app/console, grava no disco e cria a mensagem. */
  async salvarAnexo(
    id: string,
    user: UsuarioToken,
    arquivo?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const chamado = await this.exigirAcesso(id, user);
    if (!arquivo?.buffer?.length) throw new BadRequestException('Arquivo ausente ou vazio.');
    await this.assumirSePendente(chamado, user);

    const dir = join(this.config.get('uploadDir', { infer: true }), id);
    await fs.mkdir(dir, { recursive: true });
    const ext = extname(arquivo.originalname || '').slice(0, 12);
    const nomeArmazenado = `${randomUUID()}${ext}`;
    await fs.writeFile(join(dir, nomeArmazenado), arquivo.buffer);

    const ehImagem = (arquivo.mimetype || '').startsWith('image/');
    const m = await this.mensagens.save(
      this.mensagens.create({
        chamadoId: id,
        autor: user.tipo === TipoUsuario.COLABORADOR ? AutorMensagem.COLABORADOR : AutorMensagem.ATENDENTE,
        texto: '',
        horario: horaAgora(),
        anexoNome: arquivo.originalname || 'anexo',
        anexoEhImagem: ehImagem,
        anexoMime: arquivo.mimetype || 'application/octet-stream',
        anexoArquivo: `${id}/${nomeArmazenado}`,
      }),
    );
    await this.distribuir(chamado, m, user);
    return m;
  }

  /** Caminho/MIME/nome de um anexo para download, validando o acesso do usuário. */
  async lerAnexo(mensagemId: string, user: UsuarioToken) {
    const m = await this.mensagens.findOne({ where: { id: mensagemId } });
    if (!m || !m.anexoArquivo) throw new NotFoundException('Anexo não encontrado.');
    await this.exigirAcesso(m.chamadoId, user);
    return {
      caminho: join(this.config.get('uploadDir', { infer: true }), m.anexoArquivo),
      mime: m.anexoMime ?? 'application/octet-stream',
      nome: m.anexoNome ?? 'anexo',
    };
  }

  /** Garante que o chamado existe e que o usuário pode acessá-lo. */
  private async exigirAcesso(id: string, user: UsuarioToken): Promise<Chamado> {
    const chamado = await this.chamados.findOne({ where: { id } });
    if (!chamado) throw new NotFoundException('Chamado não encontrado.');
    if (user.tipo === TipoUsuario.COLABORADOR && chamado.colaboradorId !== user.sub) {
      throw new ForbiddenException('Sem acesso a este chamado.');
    }
    return chamado;
  }

  /** Atendente respondendo um chamado em espera assume o atendimento. */
  private async assumirSePendente(chamado: Chamado, user: UsuarioToken) {
    if (user.tipo === TipoUsuario.ATENDENTE && chamado.status === StatusChamado.PENDENTE) {
      chamado.status = StatusChamado.EM_ATENDIMENTO;
      chamado.atendenteId = user.sub;
      await this.chamados.save(chamado);
      await this.addSistema(chamado.id, `Protocolo ${chamado.protocolo} — Atendimento iniciado por ${user.nome}`);
    }
  }

  /** Emite a mensagem no socket e dispara as notificações para o outro lado. */
  private async distribuir(chamado: Chamado, m: Mensagem, user: UsuarioToken) {
    this.chat.emitirMensagem(chamado.id, m);
    const previa = m.texto || (m.anexoNome ? '📎 Anexo' : '');
    if (user.tipo === TipoUsuario.COLABORADOR) {
      this.chat.notificarAtendentes({
        tipo: 'mensagem',
        chamadoId: chamado.id,
        protocolo: chamado.protocolo,
        categoria: chamado.categoria,
        de: user.nome,
        texto: previa,
      });
    } else {
      this.chat.notificarColaborador(chamado.colaboradorId, {
        tipo: 'mensagem',
        chamadoId: chamado.id,
        categoria: chamado.categoria,
        de: user.nome,
        texto: previa,
      });
      void this.push.enviarParaUsuario(chamado.colaboradorId, {
        title: `Contato • ${user.nome}`,
        body: previa || 'Nova mensagem no seu atendimento.',
        url: '/',
        tag: `chamado-${chamado.id}`,
      });
    }
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

    // As aplicações são apenas de COMUNICAÇÃO: a decisão só registra o status e
    // avisa o colaborador (mensagem de sistema + status no app dele em tempo real).
    // NÃO grava nada no RM/folha — nenhuma integração de escrita é acionada aqui.
    chamado.status = decisao === 'APROVADO' ? StatusChamado.APROVADO : StatusChamado.RECUSADO;
    chamado.atendenteId = user.sub;
    chamado.motivoRecusa = decisao === 'RECUSADO' ? motivo!.trim() : null;
    await this.chamados.save(chamado);
    const rotulo = decisao === 'APROVADO' ? 'Aprovado' : 'Recusado';
    await this.addSistema(id, `Protocolo ${chamado.protocolo} — Atendimento finalizado por ${user.nome} (${rotulo})`);
    this.chat.emitirAtualizacao(id);
    this.chat.notificarColaborador(chamado.colaboradorId, {
      tipo: 'decisao',
      chamadoId: id,
      categoria: chamado.categoria,
      decisao,
    });
    void this.push.enviarParaUsuario(chamado.colaboradorId, {
      title: 'Contato • Resultado',
      body: decisao === 'APROVADO' ? 'Sua justificativa foi aprovada. ✅' : 'Sua justificativa foi recusada.',
      url: '/',
      tag: `decisao-${id}`,
    });
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
