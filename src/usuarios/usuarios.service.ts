import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Papel, TipoUsuario } from '../common/enums';
import { normalizarCpf } from '../common/cpf.util';
import {
  conferirSenha,
  gerarSenhaTemporaria,
  hashSenha,
  senhaForte,
  usuarioPublico,
} from '../common/senha.util';
import { Usuario } from '../entities/usuario.entity';
import { CriarAtendenteDto } from './usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private readonly repo: Repository<Usuario>) {}

  /** Supervisor cadastra um novo atendente (conta criada no próprio sistema). */
  async criarAtendente(dto: CriarAtendenteDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.repo.findOne({ where: { email } })) {
      throw new ConflictException('Já existe um atendente com este e-mail.');
    }
    const u = this.repo.create({
      tipo: TipoUsuario.ATENDENTE,
      nome: dto.nome.trim(),
      email,
      setor: dto.setor?.trim() ?? null,
      papel: dto.papel ?? Papel.ATENDENTE,
      senhaHash: await hashSenha(dto.senha),
      senhaDefinida: true,
    });
    return usuarioPublico(await this.repo.save(u));
  }

  async listarAtendentes() {
    const lista = await this.repo.find({
      where: { tipo: TipoUsuario.ATENDENTE, ativo: true },
      order: { nome: 'ASC' },
    });
    return lista.map(usuarioPublico);
  }

  /** Busca colaboradores (para o atendente localizar e resetar senha). */
  async buscarColaboradores(busca?: string) {
    const termo = (busca ?? '').trim();
    const cpf = normalizarCpf(termo);
    const where = termo
      ? [
          { tipo: TipoUsuario.COLABORADOR, nome: ILike(`%${termo}%`) },
          ...(cpf ? [{ tipo: TipoUsuario.COLABORADOR, cpf: ILike(`%${cpf}%`) }] : []),
          { tipo: TipoUsuario.COLABORADOR, matricula: ILike(`%${termo}%`) },
        ]
      : { tipo: TipoUsuario.COLABORADOR };
    const lista = await this.repo.find({ where, order: { nome: 'ASC' }, take: 30 });
    return lista.map(usuarioPublico);
  }

  /** Usuário troca a própria senha (colaborador ou atendente). */
  async trocarPropriaSenha(usuarioId: string, senhaAtual: string | undefined, novaSenha: string) {
    if (!senhaForte(novaSenha)) throw new BadRequestException('A nova senha deve ter ao menos 6 caracteres.');
    const u = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.senhaHash')
      .where('u.id = :id', { id: usuarioId })
      .getOne();
    if (!u) throw new NotFoundException('Usuário não encontrado.');

    // Se já havia senha, exige a atual (a menos que esteja em troca obrigatória).
    if (u.senhaHash && u.senhaDefinida && !u.precisaTrocarSenha) {
      if (!senhaAtual || !(await conferirSenha(senhaAtual, u.senhaHash))) {
        throw new BadRequestException('Senha atual incorreta.');
      }
    }
    u.senhaHash = await hashSenha(novaSenha);
    u.senhaDefinida = true;
    u.precisaTrocarSenha = false;
    await this.repo.save(u);
    return { ok: true };
  }

  /** Atendente reseta a senha de um colaborador (força troca no próximo acesso). */
  async resetarSenhaColaborador(colaboradorId: string, novaSenha?: string) {
    const u = await this.repo.findOne({ where: { id: colaboradorId } });
    if (!u || u.tipo !== TipoUsuario.COLABORADOR) {
      throw new NotFoundException('Colaborador não encontrado.');
    }
    const senha = novaSenha?.trim() || gerarSenhaTemporaria();
    if (!senhaForte(senha)) throw new BadRequestException('A senha deve ter ao menos 6 caracteres.');
    u.senhaHash = await hashSenha(senha);
    u.senhaDefinida = true;
    u.precisaTrocarSenha = true;
    await this.repo.save(u);
    // Devolve a senha temporária só quando foi gerada pelo sistema (atendente repassa ao colaborador).
    return { ok: true, senhaTemporaria: novaSenha ? undefined : senha, precisaTrocarSenha: true };
  }
}
