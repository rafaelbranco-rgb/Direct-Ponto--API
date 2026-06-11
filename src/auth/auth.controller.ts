import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { UsuarioToken } from '../common/enums';
import { JwtAuthGuard, UsuarioAtual } from '../common/guards';
import { AuthService } from './auth.service';
import { DefinirSenhaDto, LoginDto, VerificarCpfDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Limites mais apertados nos endpoints sensíveis (anti força-bruta).
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.identificador, dto.senha);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('colaborador/verificar')
  verificar(@Body() dto: VerificarCpfDto) {
    return this.auth.verificarColaborador(dto.cpf);
  }

  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('colaborador/definir-senha')
  definirSenha(@Body() dto: DefinirSenhaDto) {
    return this.auth.definirSenhaColaborador(dto.cpf, dto.senha);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@UsuarioAtual() user: UsuarioToken) {
    return this.auth.perfil(user.sub);
  }
}
