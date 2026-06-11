import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Papel, TipoUsuario } from '../common/enums';

/** Colaboradores e atendentes. Senha sempre como hash (bcrypt), nunca em texto. */
@Entity('usuarios')
export class Usuario {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  gerarId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'enum', enum: TipoUsuario })
  tipo: TipoUsuario;

  @Column()
  nome: string;

  @Index({ unique: true, where: '"cpf" IS NOT NULL' })
  @Column({ type: 'varchar', length: 11, nullable: true })
  cpf: string | null;

  @Column({ type: 'varchar', nullable: true })
  matricula: string | null;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  setor: string | null;

  @Column({ type: 'enum', enum: Papel, nullable: true })
  papel: Papel | null;

  /** Hash bcrypt da senha. select:false → nunca retorna sem addSelect explícito. */
  @Column({ type: 'varchar', nullable: true, select: false })
  senhaHash: string | null;

  /** Colaborador só define a senha no 1º acesso. */
  @Column({ default: false })
  senhaDefinida: boolean;

  /** Forçar troca de senha no próximo login (após reset por atendente). */
  @Column({ default: false })
  precisaTrocarSenha: boolean;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
