# Backend (Contato API)

NestJS + TypeScript + PostgreSQL (TypeORM) + WebSocket (Socket.IO). Pasta `Direct-Ponto-api/`.

## Como rodar (dev)
```bash
cp .env.example .env      # ajuste DB_* e RM_* (veja 04-INTEGRACAO-RM)
npm install
npm run seed              # cria o supervisor inicial (admin@contato.local / admin123)
npm run start:dev         # http://localhost:3333/api
```
Build de produção: `npm run build` → `npm start` (roda `dist/main.js`).

## Estrutura
```
src/
  main.ts                 bootstrap (helmet, CORS, ValidationPipe, prefixo /api)
  app.module.ts           módulos + TypeORM + ThrottlerGuard global
  config/configuracao.ts  todas as envs tipadas
  common/                 enums, guards (JwtAuthGuard, PapeisGuard), cpf/senha utils
  entities/               Usuario, Chamado, Mensagem (PK uuid gerada no app)
  auth/                   login, 1º acesso por CPF, /me
  usuarios/               cadastro de atendente, troca/reset de senha, busca colaborador
  chamados/               abrir, listar (filas), atender, decidir, transferir, mensagens
                          + chat.gateway.ts (WebSocket)
  integracao/             rm.service (web service RM) + sincronizacao (RM → Postgres)
  seed.ts                 cria o supervisor inicial
```

## Segurança
- Senhas em **bcrypt** (custo 12), coluna `senhaHash` com `select:false` (nunca sai do banco sem pedir).
- **JWT** (12h) com `JWT_SECRET`. Papéis `atendente`/`supervisor` via `PapeisGuard`.
- **Helmet**, **rate-limit** apertado no login (anti força-bruta), **ValidationPipe** estrito.
- Login responde mensagem genérica (não revela se o usuário existe).

## Endpoints (prefixo `/api`)
### Auth
- `POST /auth/login` `{ identificador, senha }` → `{ token, usuario, precisaTrocarSenha }`
- `POST /auth/colaborador/verificar` `{ cpf }` → 1º acesso (acha no nosso banco já sincronizado do RM)
- `POST /auth/colaborador/definir-senha` `{ cpf, senha }` → token
- `GET /auth/me`

### Usuários / senhas
- `POST /usuarios/atendentes` (supervisor) — cadastra atendente
- `GET /usuarios/atendentes` — lista (destinos de transferência)
- `GET /usuarios/colaboradores?busca=` — busca colaborador
- `PATCH /usuarios/me/senha` `{ senhaAtual?, novaSenha }`
- `POST /usuarios/colaboradores/:id/resetar-senha` (atendente) — gera senha temporária

### Chamados (chat)
- `POST /chamados` (colaborador) — abre justificativa
- `GET /chamados` — colaborador→os seus / atendente→filas (espera/atendimento/encerrados)
- `GET /chamados/:id` — detalhe + mensagens
- `POST /chamados/:id/mensagens` — envia mensagem
- `POST /chamados/:id/atender` · `/decisao` · `/transferir`

### Integração
- `POST /integracao/sincronizar-rm` (supervisor) — puxa funcionários do RM → Postgres

### WebSocket
Namespace `/chat` (token no handshake). Eventos: `entrar`/`sair`, `mensagem:nova`,
`chamado:novo`, `chamado:atualizado`.

## Banco
Postgres. Tabelas: `usuarios` (colaborador/atendente), `chamados`, `mensagens`.
`DB_SYNC=true` cria/atualiza o schema em dev; em produção use migrations e `false`.
