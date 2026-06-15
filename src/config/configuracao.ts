/** Configuração centralizada, lida do ambiente (.env). */
export interface Config {
  port: number;
  host: string;
  corsOrigins: string[];
  jwt: { secret: string; expiraEm: string };
  push: {
    vapidPublic: string;
    vapidPrivate: string;
    vapidSubject: string;
  };
  db: {
    host: string;
    port: number;
    user: string;
    senha: string;
    base: string;
    sync: boolean;
    ssl: boolean;
  };
  rm: {
    /** Em dev, sem RM configurado, simula respostas. */
    fake: boolean;
    /** Web service do RM (Consulta SQL) para funcionários/CPF. */
    apiUrl: string;
    apiUser: string;
    apiPass: string;
    consultaCod: string;
    coligada: number;
    sistema: string;
    /** n8n (gravar ajuste na folha / consultar ponto) — pode entrar depois. */
    consultarPontoUrl: string;
    gravarAjusteUrl: string;
    token: string;
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
  push: {
    vapidPublic: process.env.VAPID_PUBLIC ?? '',
    vapidPrivate: process.env.VAPID_PRIVATE ?? '',
    vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:ti@aionscorp.com',
  },
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'contato',
    senha: process.env.DB_PASS ?? 'contato',
    base: process.env.DB_NAME ?? 'contato',
    sync: (process.env.DB_SYNC ?? 'true') === 'true',
    ssl: (process.env.DB_SSL ?? 'false') === 'true',
  },
  rm: {
    fake: (process.env.RM_FAKE ?? 'true') === 'true',
    apiUrl: (process.env.RM_API_URL ?? '').replace(/\/$/, ''),
    apiUser: process.env.RM_API_USER ?? '',
    apiPass: process.env.RM_API_PASS ?? '',
    consultaCod: process.env.RM_CONSULTA_COD ?? '',
    coligada: Number(process.env.RM_COLIGADA ?? 1),
    sistema: process.env.RM_SISTEMA ?? 'P',
    consultarPontoUrl: process.env.N8N_RM_PONTO_URL ?? '',
    gravarAjusteUrl: process.env.N8N_RM_AJUSTE_URL ?? '',
    token: process.env.N8N_TOKEN ?? '',
  },
});
