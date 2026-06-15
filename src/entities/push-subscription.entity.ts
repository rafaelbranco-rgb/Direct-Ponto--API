import { randomUUID } from 'crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Inscrição de Web Push (PWA) de um colaborador. Cada navegador/dispositivo
 * gera um `endpoint` único; guardamos as chaves para enviar a notificação via
 * protocolo Web Push (VAPID). Um usuário pode ter várias (vários aparelhos).
 */
@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  gerarId() {
    if (!this.id) this.id = randomUUID();
  }

  @Index()
  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'text', unique: true })
  endpoint: string;

  @Column({ type: 'text' })
  p256dh: string;

  @Column({ type: 'text' })
  auth: string;

  @CreateDateColumn()
  criadoEm: Date;
}
