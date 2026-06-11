# Contato API — backend (interno / on-premise)

Backend único que liga o **app do colaborador** (justificar ponto) e o **console dos atendentes**.
Roda **dentro da VM, na rede da empresa** — não é exposto à internet.

- **Stack:** NestJS + TypeScript + PostgreSQL (TypeORM) + WebSocket (Socket.IO).
- **Segurança:** senhas com **bcrypt** (custo 12, nunca em texto), **JWT**, papéis (atendente/supervisor), Helmet, rate-limit nos endpoints de login, validação estrita de payload.
- **Integração RM/Nexti:** somente via **n8n** (o backend nunca fala direto com o TOTVS).

## Subir em desenvolvimento

```bash
cp .env.example .env          # ajuste os valores
docker compose up -d postgres # ou um Postgres local
npm install
npm run seed                  # cria o supervisor inicial (admin@contato.local / admin123)
npm run start:dev
# API em http://localhost:3333/api
```

Com `RM_FAKE=true` (padrão) o RM é simulado — dá para testar o 1º acesso por CPF sem o n8n.

## Subir na VM (produção)

```bash
docker compose up -d          # API + Postgres juntos
docker compose exec api node dist/seed.js   # opcional, se rodar o seed em container
```

Defina `JWT_SECRET` forte, `DB_SYNC=false` (use migrations), `RM_FAKE=false` e as `N8N_*` reais.

## Endpoints principais (prefixo `/api`)

### Autenticação
| Método | Rota | Quem | Faz |
|---|---|---|---|
| POST | `/auth/login` | todos | `{ identificador, senha }` → token. `identificador` = CPF, e-mail ou matrícula |
| POST | `/auth/colaborador/verificar` | colaborador | `{ cpf }` → valida no RM e garante o cadastro (1º acesso) |
| POST | `/auth/colaborador/definir-senha` | colaborador | `{ cpf, senha }` → define a senha do 1º acesso → token |
| GET | `/auth/me` | autenticado | dados do usuário logado |

### Usuários e senhas
| Método | Rota | Quem | Faz |
|---|---|---|---|
| POST | `/usuarios/atendentes` | supervisor | cadastra atendente `{ nome, email, senha, setor?, papel? }` |
| GET | `/usuarios/atendentes` | atendente | lista atendentes (destinos de transferência) |
| GET | `/usuarios/colaboradores?busca=` | atendente | busca colaboradores |
| PATCH | `/usuarios/me/senha` | autenticado | troca a própria senha `{ senhaAtual?, novaSenha }` |
| POST | `/usuarios/colaboradores/:id/resetar-senha` | atendente | reseta a senha do colaborador (força troca no próximo acesso); devolve a senha temporária se gerada |

### Chamados (chat entre os apps)
| Método | Rota | Quem | Faz |
|---|---|---|---|
| POST | `/chamados` | colaborador | abre a justificativa |
| GET | `/chamados` | colaborador→os seus / atendente→filas (espera, em atendimento, encerrados) |
| GET | `/chamados/:id` | ambos | detalhe + mensagens |
| POST | `/chamados/:id/mensagens` | ambos | envia mensagem (atendente respondendo pendente assume o chamado) |
| POST | `/chamados/:id/atender` | atendente | puxa para atendimento |
| POST | `/chamados/:id/decisao` | atendente | `{ decisao, motivo? }` → grava no RM (se aprovado) e encerra |
| POST | `/chamados/:id/transferir` | atendente | `{ atendenteId }` → passa para outro atendente |

### WebSocket
Namespace `/chat` (token no handshake `auth.token`). Eventos: `entrar`/`sair` (sala por chamado),
`mensagem:nova`, `chamado:novo`, `chamado:atualizado`.

## Fluxo do 1º acesso (cadastro por CPF do RM)
1. App envia `POST /auth/colaborador/verificar { cpf }` → backend valida no RM (n8n) e cria/garante o usuário.
2. Se `precisaDefinirSenha`, app envia `POST /auth/colaborador/definir-senha { cpf, senha }` → recebe o token.
3. Acessos seguintes: `POST /auth/login { identificador: cpf, senha }`.
