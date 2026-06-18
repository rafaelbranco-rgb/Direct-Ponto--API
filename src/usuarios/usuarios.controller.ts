import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { Papel, UsuarioToken } from '../common/enums';
import { JwtAuthGuard, Papeis, PapeisGuard, UsuarioAtual } from '../common/guards';
import { UsuariosService } from './usuarios.service';
import { CriarAtendenteDto, ResetarSenhaDto, TrocarSenhaDto } from './usuarios.dto';

@UseGuards(JwtAuthGuard, PapeisGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Qualquer conta de atendimento cadastra usuários (os papéis têm os mesmos
   *  benefícios; "atendente"/"supervisor" são apenas rótulos). */
  @Papeis(Papel.ATENDENTE, Papel.SUPERVISOR)
  @Post('atendentes')
  criarAtendente(@Body() dto: CriarAtendenteDto) {
    return this.usuarios.criarAtendente(dto);
  }

  @Get('atendentes')
  listarAtendentes() {
    return this.usuarios.listarAtendentes();
  }

  /** Atendentes/supervisores buscam colaboradores. */
  @Papeis(Papel.ATENDENTE, Papel.SUPERVISOR)
  @Get('colaboradores')
  buscarColaboradores(@Query('busca') busca?: string) {
    return this.usuarios.buscarColaboradores(busca);
  }

  /** Trocar a própria senha (qualquer usuário autenticado). */
  @Patch('me/senha')
  trocarMinhaSenha(@UsuarioAtual() user: UsuarioToken, @Body() dto: TrocarSenhaDto) {
    return this.usuarios.trocarPropriaSenha(user.sub, dto.senhaAtual, dto.novaSenha);
  }

  /** Atendente/supervisor reseta a senha de um colaborador. */
  @Papeis(Papel.ATENDENTE, Papel.SUPERVISOR)
  @Post('colaboradores/:id/resetar-senha')
  resetarSenha(@Param('id') id: string, @Body() dto: ResetarSenhaDto) {
    return this.usuarios.resetarSenhaColaborador(id, dto.novaSenha);
  }

  /** Reseta a senha de outro atendente/gestor (papéis têm os mesmos benefícios). */
  @Papeis(Papel.ATENDENTE, Papel.SUPERVISOR)
  @Post('atendentes/:id/resetar-senha')
  resetarSenhaAtendente(@Param('id') id: string, @Body() dto: ResetarSenhaDto) {
    return this.usuarios.resetarSenhaAtendente(id, dto.novaSenha);
  }
}
