# Deploy na VM (interno / Windows Server)

Objetivo: backend + Postgres + os dois fronts rodando **dentro da VM, na rede da empresa**.

## Opção A — Docker (recomendado)
Na pasta `Direct-Ponto-api/`:
```bash
copy .env.example .env        # defina JWT_SECRET forte, DB_*, RM_* reais, DB_SYNC=false em prod
docker compose up -d          # sobe API + Postgres juntos
docker compose exec api node dist/seed.js   # cria o supervisor inicial
```
A API fica em `http://IP-DA-VM:3333/api`. O Postgres fica só no localhost da VM.

## Opção B — Sem Docker (Windows nativo)
1. Instalar **PostgreSQL** na VM (criar base/usuário; usar no `.env`).
2. `npm ci && npm run build` → rodar `node dist/main.js` como **serviço do Windows**
   (pm2 + pm2-windows-service, ou NSSM).
3. `npm run seed` uma vez.

## Fronts
- **Console web:** `npm run build` (Vite) → servir a pasta `dist/` (IIS, nginx, ou `serve`).
  Definir `VITE_API_URL=http://IP-DA-VM:3333` **no build**.
- **App (web):** Expo export web (`npx expo export -p web`) → servir; definir
  `EXPO_PUBLIC_API_URL=http://IP-DA-VM:3333`. Para celular, build do app apontando para o IP da VM.

## Rede / segurança
- **Interno:** liberar a porta da API (3333) **só na rede da empresa** — não expor à internet.
- `CORS_ORIGINS` = as URLs internas dos fronts (ou vazio para liberar na intranet).
- HTTPS interno opcional (reverse proxy Caddy/nginx) se quiser TLS na rede.
- RM: usar **usuário de integração só leitura** no `.env`.

## Pós-deploy
- Rodar `POST /api/integracao/sincronizar-rm` (supervisor) para popular os colaboradores.
- Agendar a re-sincronização (ex.: diária).
- Trocar a senha do supervisor inicial.
