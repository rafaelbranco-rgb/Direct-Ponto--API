# Contato — Visão Geral

Canal próprio de **justificativa de ponto** que substitui o **Nexti Direct**. É um
**chat de atendimento**: o colaborador abre um chamado pelo celular, o atendente
responde pelo console web, aprova/recusa, e o ajuste segue para a folha.

## As 3 peças (repositórios separados)

| Peça | O que é | Repo | Stack |
|---|---|---|---|
| **App do colaborador** | Mobile (justificar ponto) | `Direct-Ponto` (`contato-app/`) | Expo SDK 56 / React Native / RN-web |
| **Console do atendente** | Web (atender/aprovar/RH) | `Direct-Ponto--web` (`Direct-Ponto-web/`) | Vite + React + Tailwind v4 |
| **Backend (API)** | Cérebro + banco | `Direct-Ponto--API` (`Direct-Ponto-api/`) | NestJS + PostgreSQL + WebSocket |

> **2 frontends, 1 backend, 1 banco.** Os dois apps conversam pelo mesmo backend
> (como WhatsApp: clientes diferentes, mesmo servidor).

## Desenho

```
  📱 App colaborador ──┐                          ┌── RM (Consulta SQL, SÓ LEITURA)
                       │   HTTPS + WebSocket      │   nomes/CPF/chapa
  💻 Console atendente ┼──►  Backend NestJS  ─────┤
                       │     + PostgreSQL         └── (futuro) gravar ajuste na folha
                       └──   (na VM interna)
```

## Modelo de atendimento (console)
- **Pool de atendentes.** Toda conta com admin é atendente. Dois papéis:
  `atendente` (atende, aprova/recusa, transfere) e `supervisor/RH` (vê tudo + relatórios).
- **Cada atendente tem a SUA fila** "Em atendimento"; "Em espera" é compartilhada.
- **Transferência** imediata e direcionada (sai da fila de um, entra na do outro).
- Contas de atendente criadas no próprio sistema (supervisor cadastra).

## Decisões-chave
- **Interno/on-premise:** roda dentro da VM, na rede da empresa (não exposto à internet).
- **RM é só leitura.** Nomes/CPF vêm da Consulta SQL do RM; nada é escrito no RM.
- **n8n praticamente dispensado** (a integração de nomes é direta). Só *poderia*
  voltar para gravar o ajuste na folha — ainda a definir, e nunca sem autorização.

Veja também: [01-BACKEND](01-BACKEND.md) · [02-CONSOLE-WEB](02-CONSOLE-WEB.md) ·
[03-APP-MOBILE](03-APP-MOBILE.md) · [04-INTEGRACAO-RM](04-INTEGRACAO-RM.md) ·
[05-STATUS](05-STATUS.md) · [06-DEPLOY-VM](06-DEPLOY-VM.md)
