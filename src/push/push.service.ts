import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';

import type { Config } from '../config/configuracao';
import { PushSubscription } from '../entities/push-subscription.entity';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Agrupa notificações do mesmo chamado (a nova substitui a anterior). */
  tag?: string;
}

interface InscricaoBruta {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/**
 * Envio de notificações via Web Push (VAPID). Funciona com o app fechado/em
 * segundo plano (iOS 16.4+ exige PWA instalada na tela inicial; Android Chrome
 * funciona com a PWA). Sem VAPID configurado, fica inativo (degrada para o
 * socket/toast quando o app está aberto).
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);
  private ativo = false;
  readonly chavePublica: string;

  constructor(
    @InjectRepository(PushSubscription) private readonly repo: Repository<PushSubscription>,
    config: ConfigService<Config, true>,
  ) {
    const p = config.get('push', { infer: true });
    this.chavePublica = p.vapidPublic;
    if (p.vapidPublic && p.vapidPrivate) {
      webpush.setVapidDetails(p.vapidSubject || 'mailto:ti@aionscorp.com', p.vapidPublic, p.vapidPrivate);
      this.ativo = true;
      this.log.log('Web Push ativo (VAPID configurado).');
    } else {
      this.log.warn('VAPID não configurado (VAPID_PUBLIC/VAPID_PRIVATE) — push desativado.');
    }
  }

  /** Salva/atualiza a inscrição do dispositivo para o usuário. */
  async inscrever(usuarioId: string, sub: InscricaoBruta) {
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
    const existe = await this.repo.findOne({ where: { endpoint: sub.endpoint } });
    if (existe) {
      existe.usuarioId = usuarioId;
      existe.p256dh = sub.keys.p256dh;
      existe.auth = sub.keys.auth;
      await this.repo.save(existe);
    } else {
      await this.repo.save(
        this.repo.create({ usuarioId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }),
      );
    }
    return { ok: true };
  }

  /** Envia a notificação para todos os dispositivos inscritos do usuário. */
  async enviarParaUsuario(usuarioId: string, payload: PushPayload) {
    if (!this.ativo) return;
    const subs = await this.repo.find({ where: { usuarioId } });
    if (!subs.length) return;
    const corpo = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            corpo,
          );
        } catch (e: any) {
          const code = e?.statusCode;
          // 404/410 = inscrição expirada/cancelada → remove para não tentar de novo.
          if (code === 404 || code === 410) {
            await this.repo.delete({ endpoint: s.endpoint });
          } else {
            this.log.warn(`Falha ao enviar push (${code ?? e?.message}).`);
          }
        }
      }),
    );
  }
}
