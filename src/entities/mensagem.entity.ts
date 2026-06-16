import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { AutorMensagem } from '../common/enums';
import { Chamado } from './chamado.entity';

@Entity('mensagens')
export class Mensagem {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  gerarId() {
    if (!this.id) this.id = randomUUID();
  }

  @ManyToOne(() => Chamado, (c) => c.mensagens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chamado_id' })
  chamado: Chamado;

  @Column({ name: 'chamado_id' })
  chamadoId: string;

  @Column({ type: 'enum', enum: AutorMensagem })
  autor: AutorMensagem;

  @Column({ type: 'text', default: '' })
  texto: string;

  @Column({ type: 'varchar', nullable: true })
  horario: string | null;

  @Column({ type: 'varchar', nullable: true })
  anexoNome: string | null;

  @Column({ type: 'boolean', nullable: true })
  anexoEhImagem: boolean | null;

  /** MIME do anexo (ex.: image/jpeg, application/pdf). */
  @Column({ type: 'varchar', nullable: true })
  anexoMime: string | null;

  /** Caminho relativo do arquivo salvo no disco (uploadDir): "<chamadoId>/<uuid>.ext". */
  @Column({ type: 'varchar', nullable: true })
  anexoArquivo: string | null;

  @CreateDateColumn()
  criadoEm: Date;
}
