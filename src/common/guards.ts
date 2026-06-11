import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { Papel, UsuarioToken } from './enums';

/** Valida o Bearer token e injeta o usuário (req.user). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers?.authorization ?? '';
    const [tipo, token] = header.split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Token ausente.');
    try {
      req.user = this.jwt.verify<UsuarioToken>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}

export const PAPEIS_CHAVE = 'papeis';
/** Restringe a rota a determinados papéis de atendente. */
export const Papeis = (...papeis: Papel[]) => SetMetadata(PAPEIS_CHAVE, papeis);

/** Exige que o usuário autenticado tenha um dos papéis informados. */
@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Papel[]>(PAPEIS_CHAVE, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!exigidos || exigidos.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user as UsuarioToken | undefined;
    if (!user?.papel || !exigidos.includes(user.papel)) {
      throw new UnauthorizedException('Sem permissão para esta ação.');
    }
    return true;
  }
}

/** Injeta o usuário autenticado no parâmetro do handler. */
export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioToken => ctx.switchToHttp().getRequest().user,
);
