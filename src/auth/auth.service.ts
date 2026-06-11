import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Papel, TipoUsuario, UsuarioToken } from '../common/enums';
import { cpfValido, normalizarCpf } from '../common/cpf.util';
import { conferirSenha, hashSenha, senhaForte, usuarioPublico } from '../common/senha.util';
import { Usuario } from '../entities/usuario.entity';
import { RmService } from '../integracao/rm.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly jwt: JwtService,
    private readonly rm: RmService,
  ) {}

  private emitir(u: Usuario): string {
    const payload: UsuarioToken = { sub: u.id, tipo: u.tipo, papel: u.papel, nome: u.nome };
    return this.jwt.sign(payload);
  }

  /** Login por CPF (colaborador) ou e-mail/matrícula (atendente). */
  async login(identificador: string, senha: string) {
    const id = (identificador ?? '').trim();
    const cpf = normalizarCpf(id);
    const u = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.senhaHash')
      .where('LOWER(u.email) = LOWER(:id) OR u.matricula = :id' + (cpf ? ' OR u.cpf = :cpf' : ''), { id, cpf })
      .getOne();

    // Mensagem genérica para não revelar se o usuário existe.
    if (!u || !u.ativo || !u.senhaDefinida || !u.senhaHash) {
      throw new UnauthorizedException('Credenciais inválidas ou senha não definida.');
    }
    if (!(await conferirSenha(senha, u.senhaHash))) {
      throw new UnauthorizedException('Credenciais inválidas ou senha não definida.');
    }
    return { token: this.emitir(u), usuario: usuarioPublico(u), precisaTrocarSenha: u.precisaTrocarSenha };
  }

  /** 1º acesso do colaborador: valida o CPF no RM e garante o cadastro. */
  async verificarColaborador(cpfEntrada: string) {
    if (!cpfValido(cpfEntrada)) throw new BadRequestException('CPF inválido.');
    const cpf = normalizarCpf(cpfEntrada);

    let u = await this.repo.findOne({ where: { cpf } });
    if (!u) {
      const rm = await this.rm.validarPorCpf(cpf);
      if (!rm.valido) throw new NotFoundException('CPF não encontrado no RM.');
      u = await this.repo.save(
        this.repo.create({
          tipo: TipoUsuario.COLABORADOR,
          nome: rm.nome ?? 'Colaborador',
          cpf,
          matricula: rm.matricula ?? null,
          setor: rm.setor ?? null,
          papel: null,
          senhaDefinida: false,
        }),
      );
    }
    return {
      nome: u.nome,
      senhaDefinida: u.senhaDefinida,
      precisaTrocarSenha: u.precisaTrocarSenha,
      precisaDefinirSenha: !u.senhaDefinida || u.precisaTrocarSenha,
    };
  }

  /** Define a senha do colaborador no 1º acesso (ou após reset). */
  async definirSenhaColaborador(cpfEntrada: string, senha: string) {
    if (!senhaForte(senha)) throw new BadRequestException('A senha deve ter ao menos 6 caracteres.');
    const cpf = normalizarCpf(cpfEntrada);
    const u = await this.repo.findOne({ where: { cpf } });
    if (!u) throw new NotFoundException('Faça a verificação do CPF antes de definir a senha.');
    if (u.senhaDefinida && !u.precisaTrocarSenha) {
      throw new BadRequestException('Senha já definida. Use a opção de trocar senha.');
    }
    u.senhaHash = await hashSenha(senha);
    u.senhaDefinida = true;
    u.precisaTrocarSenha = false;
    await this.repo.save(u);
    return { token: this.emitir(u), usuario: usuarioPublico(u) };
  }

  async perfil(id: string) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    return usuarioPublico(u);
  }

  /** Conveniência para o seed/admin. */
  papelPadrao(): Papel {
    return Papel.ATENDENTE;
  }
}
