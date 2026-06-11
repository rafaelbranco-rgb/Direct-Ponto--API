import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Categoria, StatusChamado } from '../common/enums';
import { Mensagem } from './mensagem.entity';
import { Usuario } from './usuario.entity';

@Entity('chamados')
export class Chamado {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  gerarId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ unique: true })
  protocolo: string;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'colaborador_id' })
  colaborador: Usuario;

  @Column({ name: 'colaborador_id' })
  colaboradorId: string;

  @Column({ type: 'enum', enum: Categoria })
  categoria: Categoria;

  @Column({ type: 'enum', enum: StatusChamado, default: StatusChamado.PENDENTE })
  status: StatusChamado;

  @Column({ type: 'date' })
  dataOcorrencia: string;

  @Column({ type: 'varchar', nullable: true })
  horarioOriginal: string | null;

  @Column({ type: 'varchar', nullable: true })
  horarioProposto: string | null;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'atendente_id' })
  atendente: Usuario | null;

  @Column({ name: 'atendente_id', type: 'uuid', nullable: true })
  atendenteId: string | null;

  @Column({ type: 'text', nullable: true })
  motivoRecusa: string | null;

  @OneToMany(() => Mensagem, (m) => m.chamado)
  mensagens: Mensagem[];

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
