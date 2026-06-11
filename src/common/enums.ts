/** Tipos de usuário do sistema. */
export enum TipoUsuario {
  COLABORADOR = 'COLABORADOR',
  ATENDENTE = 'ATENDENTE',
}

/** Papel do atendente no console (null para colaborador). */
export enum Papel {
  ATENDENTE = 'ATENDENTE',
  SUPERVISOR = 'SUPERVISOR',
}

export enum StatusChamado {
  PENDENTE = 'PENDENTE',
  EM_ATENDIMENTO = 'EM_ATENDIMENTO',
  APROVADO = 'APROVADO',
  RECUSADO = 'RECUSADO',
}

export enum AutorMensagem {
  COLABORADOR = 'COLABORADOR',
  ATENDENTE = 'ATENDENTE',
  SISTEMA = 'SISTEMA',
}

export enum Categoria {
  ATRASO = 'ATRASO',
  FALTA = 'FALTA',
  ENTRADA_ANTECIPADA = 'ENTRADA_ANTECIPADA',
  ATESTADO = 'ATESTADO',
  SAIDA_TARDIA = 'SAIDA_TARDIA',
  SAIDA_ANTECIPADA = 'SAIDA_ANTECIPADA',
  ESQUECIMENTO = 'ESQUECIMENTO',
  SAIDA_EXPEDIENTE = 'SAIDA_EXPEDIENTE',
  BANCO_HORAS = 'BANCO_HORAS',
}

/** Payload do JWT. */
export interface UsuarioToken {
  sub: string;
  tipo: TipoUsuario;
  papel: Papel | null;
  nome: string;
}
