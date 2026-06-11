import { Controller, Post, UseGuards } from '@nestjs/common';

import { Papel } from '../common/enums';
import { JwtAuthGuard, Papeis, PapeisGuard } from '../common/guards';
import { SincronizacaoService } from './sincronizacao.service';

@UseGuards(JwtAuthGuard, PapeisGuard)
@Controller('integracao')
export class IntegracaoController {
  constructor(private readonly sync: SincronizacaoService) {}

  /** Supervisor dispara a sincronização dos funcionários do RM. */
  @Papeis(Papel.SUPERVISOR)
  @Post('sincronizar-rm')
  sincronizar() {
    return this.sync.sincronizar();
  }
}
