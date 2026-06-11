import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AutorMensagem } from '../common/enums';
import { Chamado } from './chamado.entity';

@Entity('mensagens')
export class Mensagem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @CreateDateColumn()
  criadoEm: Date;
}
