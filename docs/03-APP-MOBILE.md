# App do Colaborador (mobile)

Pasta `contato-app/` · repo `Direct-Ponto`. Expo SDK 56 / React Native / RN-web / expo-router.

> ⚠️ Expo SDK 56: confira os docs versionados antes de mexer em APIs nativas
> (https://docs.expo.dev/versions/v56.0.0/). Veja `AGENTS.md` na raiz.

## Como rodar
```bash
npm install
# Para falar com o backend, crie .env:
#   EXPO_PUBLIC_API_URL=http://localhost:3333    (web)
#   EXPO_PUBLIC_API_URL=http://IP-DA-MAQUINA:3333 (celular real)
#   vazio = modo demonstração (mock)
npm run web      # ou: npm start (Expo) / npm run android / ios
```

## Telas (`src/app/`)
- **login** — login real + **1º acesso por CPF** (verifica no nosso banco → define senha).
- **index** — caixa de entrada (categorias + busca), saudação pelo nome.
- **categoria/[codigo]** — chat com triagem (abrir/justificar). *(ainda no mock — ver Pendências)*
- **pedidos** — **lista os chamados reais** do colaborador (`GET /chamados`).
- **notificacoes** — avisos.

## Conexão com o backend
- `src/data/api.ts` — cliente do backend (token: localStorage no web, memória no nativo)
  com os endpoints do colaborador.
- `src/context/auth.tsx` — login real, 1º acesso, restauração por `/auth/me`, fallback demo.

## Pendências do mobile
- **Chat/abrir-chamado ao vivo**: hoje a conversa por categoria ainda usa o mock. Falta casar
  o modelo "conversa por categoria" (app) com "chamado por protocolo" (backend) e plugar
  `POST /chamados`, mensagens e tempo real.
- **Persistência de token no nativo** (AsyncStorage/SecureStore) — no web já persiste.
- **Push** (Expo Push) para avisar o colaborador da decisão.
