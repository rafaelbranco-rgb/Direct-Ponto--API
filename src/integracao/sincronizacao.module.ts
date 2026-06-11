import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Usuario } from '../entities/usuario.entity';
import { IntegracaoController } from './integracao.controller';
import { SincronizacaoService } from './sincronizacao.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario]), AuthModule],
  controllers: [IntegracaoController],
  providers: [SincronizacaoService],
  exports: [SincronizacaoService],
})
export class SincronizacaoModule {}
