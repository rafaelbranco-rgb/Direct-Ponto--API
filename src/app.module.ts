import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import configuracao, { Config } from './config/configuracao';
import { AuthModule } from './auth/auth.module';
import { ChamadosModule } from './chamados/chamados.module';
import { IntegracaoModule } from './integracao/integracao.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { Chamado } from './entities/chamado.entity';
import { Mensagem } from './entities/mensagem.entity';
import { Usuario } from './entities/usuario.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuracao] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Config, true>) => {
        const db = config.get('db', { infer: true });
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.senha,
          database: db.base,
          entities: [Usuario, Chamado, Mensagem],
          synchronize: db.sync,
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    IntegracaoModule,
    AuthModule,
    UsuariosModule,
    ChamadosModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
