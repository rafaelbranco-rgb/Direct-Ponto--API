import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import type { Config } from './config/configuracao';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService) as ConfigService<Config, true>;

  app.use(helmet());
  // Intranet: se CORS_ORIGINS não for definido, libera (rede interna controlada).
  const origins = config.get('corsOrigins', { infer: true });
  app.enableCors({ origin: origins.length ? origins : true, credentials: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();

  const port = config.get('port', { infer: true });
  const host = config.get('host', { infer: true });
  await app.listen(port, host);
  new Logger('Bootstrap').log(`Contato API ouvindo em http://${host}:${port}/api`);
}

bootstrap();
