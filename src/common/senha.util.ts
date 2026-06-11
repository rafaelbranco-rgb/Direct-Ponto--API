import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

import { Usuario } from '../entities/usuario.entity';

const CUSTO = 12;

export const hashSenha = (senha: string): Promise<string> => bcrypt.hash(senha, CUSTO);
export const conferirSenha = (senha: string, hash: string): Promise<boolean> => bcrypt.compare(senha, hash);

/** Regra mínima de senha. Centralizada para evoluir depois (maiúsculas, etc.). */
export const senhaForte = (s: unknown): s is string => typeof s === 'string' && s.trim().length >= 6;

/** Senha temporária legível para o atendente repassar ao colaborador. */
export function gerarSenhaTemporaria(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += abc[randomInt(abc.length)];
  return s;
}

/** Remove o hash e qualquer campo sensível antes de enviar ao cliente. */
export function usuarioPublico(u: Usuario) {
  return {
    id: u.id,
    tipo: u.tipo,
    nome: u.nome,
    cpf: u.cpf,
    matricula: u.matricula,
    email: u.email,
    setor: u.setor,
    papel: u.papel,
    senhaDefinida: u.senhaDefinida,
    precisaTrocarSenha: u.precisaTrocarSenha,
    ativo: u.ativo,
  };
}
