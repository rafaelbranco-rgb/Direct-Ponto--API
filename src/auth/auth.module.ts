import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { Config } from '../config/configuracao';
import { JwtAuthGuard, PapeisGuard } from '../common/guards';
import { Usuario } from '../entities/usuario.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Config, true>) => {
        const jwt = config.get('jwt', { infer: true });
        return { secret: jwt.secret, signOptions: { expiresIn: jwt.expiraEm } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PapeisGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, PapeisGuard],
})
export class AuthModule {}
