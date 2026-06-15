import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { UsuarioToken } from '../common/enums';
import { JwtAuthGuard, UsuarioAtual } from '../common/guards';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Chave pública VAPID — o app precisa dela para se inscrever (sem login). */
  @Get('chave-publica')
  chavePublica() {
    return { chave: this.push.chavePublica };
  }

  /** O app envia aqui a inscrição do dispositivo (após permissão concedida). */
  @UseGuards(JwtAuthGuard)
  @Post('inscrever')
  inscrever(
    @UsuarioAtual() user: UsuarioToken,
    @Body() sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } },
  ) {
    return this.push.inscrever(user.sub, sub);
  }
}
