import { Global, Module } from '@nestjs/common';

import { RmService } from './rm.service';

/** RmService é global (usado por auth, chamados, sincronização). */
@Global()
@Module({
  providers: [RmService],
  exports: [RmService],
})
export class IntegracaoModule {}
