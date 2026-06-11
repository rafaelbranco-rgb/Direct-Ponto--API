import { Global, Module } from '@nestjs/common';

import { RmService } from './rm.service';

@Global()
@Module({
  providers: [RmService],
  exports: [RmService],
})
export class IntegracaoModule {}
