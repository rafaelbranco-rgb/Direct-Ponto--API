import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { PushModule } from '../push/push.module';
import { Chamado } from '../entities/chamado.entity';
import { Mensagem } from '../entities/mensagem.entity';
import { Usuario } from '../entities/usuario.entity';
import { ChamadosController } from './chamados.controller';
import { ChamadosService } from './chamados.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Chamado, Mensagem, Usuario]), AuthModule, PushModule],
  controllers: [ChamadosController],
  providers: [ChamadosService, ChatGateway],
})
export class ChamadosModule {}
