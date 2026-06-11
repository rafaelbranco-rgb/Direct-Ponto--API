# Console do Atendente (web)

Pasta `Direct-Ponto-web/` · repo `Direct-Ponto--web`. Vite + React + Tailwind v4 + lucide + Recharts.

## Como rodar
```bash
npm install
# Para falar com o backend, crie .env:
#   VITE_API_URL=http://localhost:3333   (vazio = modo demonstração com mock)
npx vite --port 5174
```
Login (modo backend): `admin@contato.local` / `admin123` (supervisor do seed).

## Telas
- **Atendimentos** — lista em seções estilo Nexti: **Em atendimento** (a sua fila),
  **Em espera** (compartilhada, com botão *Atender*) e **Encerrados**. Badge de não-lidas.
  Conversa com aprovar/recusar/transferir, anexos, tempo real.
- **Histórico** — por colaborador → protocolos → conversa e resultado.
- **Relatórios** (só supervisor) — KPIs + gráficos (donut/barras animadas) + export CSV/PDF.
- **Configurações** — tema, notificações (persistidas), trocar a própria senha e
  **resetar senha de colaborador** (busca + senha temporária).

## Conexão com o backend
- `src/lib/api.ts` — cliente tipado (token JWT, todos os endpoints) + WebSocket (socket.io-client).
- `src/lib/adapters.ts` — converte os dados do backend para os tipos dos componentes
  (registra colaboradores em runtime para `colaboradorPorId` seguir funcionando).
- `src/context/auth.tsx` — login real + `/auth/me` ao abrir; **fallback demo** sem `VITE_API_URL`.
- `Console.tsx` — filas reais, chat, ações via API e recarga por WebSocket
  (`chamado:novo` / `chamado:atualizado`).

## Papéis
Supervisor vê tudo + aba Relatórios + cadastro de atendentes. Atendente vê só a própria
fila. No modo demo há um "trocador de atendente" (escondido no modo backend).
