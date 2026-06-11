/** Configuração centralizada, lida do ambiente (.env). */
export interface Config {
  port: number;
  host: string;
  corsOrigins: string[];
  jwt: { secret: string; expiraEm: string };
  db: {
    host: string;
    port: number;
    user: string;
    senha: string;
    base: string;
    sync: boolean;
  };
  rm: {
    validarUrl: string;
    consultarPontoUrl: string;
    gravarAjusteUrl: string;
    token: string;
    /** Em dev, sem n8n configurado, simula respostas do RM. */
    fake: boolean;
  };
}

const lista = (v?: string) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default (): Config => ({
  port: Number(process.env.PORT ?? 3333),
  host: process.env.HOST ?? '0.0.0.0',
  corsOrigins: lista(process.env.CORS_ORIGINS) ,
  jwt: {
    secret: process.env.JWT_SECRET ?? 'troque-este-segredo-em-producao',
    expiraEm: process.env.JWT_EXPIRA_EM ?? '12h',
  },
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'contato',
    senha: process.env.DB_PASS ?? 'contato',
    base: process.env.DB_NAME ?? 'contato',
    sync: (process.env.DB_SYNC ?? 'true') === 'true',
  },
  rm: {
    validarUrl: process.env.N8N_RM_VALIDAR_URL ?? '',
    consultarPontoUrl: process.env.N8N_RM_PONTO_URL ?? '',
    gravarAjusteUrl: process.env.N8N_RM_AJUSTE_URL ?? '',
    token: process.env.N8N_TOKEN ?? '',
    fake: (process.env.RM_FAKE ?? 'true') === 'true',
  },
});
