# Status — Feito x Pendente

Atualizado em 11/06/2026. Mapeia os 22 subelementos da demanda
"Desenvolvimento de Canal Próprio de Justificativa de Ponto — Contato".

## ✅ Concluídos
| # | Subelemento | Onde |
|---|---|---|
| 1 | Planejamento | — |
| 2 | Mapear Funcionalidades do Nexti Direct | — |
| 3 | Planejar Plataforma Mobile | — |
| 4 | Iniciar o aplicativo do colaborador | `contato-app` |
| 5 | Tela inicial do app (categorias e busca) | `app/index.tsx` |
| 6 | Enviar justificativa com foto/atestado | `app/categoria` |
| 7 | Acompanhamento dos pedidos | `app/pedidos.tsx` (lista real) |
| 8 | Montar servidor + login colaborador (CPF) | backend + 1º acesso por CPF ✔ ao vivo |
| 9 | Planejar Plataforma Web | arquitetura + console |
| 11 | Iniciar a plataforma web (gestor/RH) | `Direct-Ponto-web` |
| 12 | Login do gestor e do RH | auth backend + papéis atendente/supervisor |
| 13 | Tela do gestor para aprovar pedidos | `ConversaPane` |
| 15 | Preparar a base de dados | Postgres (rodando; 1.575 colaboradores sincronizados) |
| 16 | Relatórios para o RH | `Relatorios.tsx` + export |

## 🔶 Em andamento
| # | Subelemento | Falta |
|---|---|---|
| 10 | Buscar o ponto do colaborador no Nexti | infra RM pronta; falta a consulta de **marcações de ponto** (hoje só funcionários/CPF) |
| 14 | Painel do RH para análise final | papel supervisor (vê tudo + relatórios) pronto; falta fluxo de "análise final" dedicado |
| 17 | Avisar o colaborador sobre a decisão | WebSocket no console pronto; falta **push** real no app |
| 18 | Enviar ajuste aprovado para a folha (RM Labore) | fluxo de decisão pronto; **escrita no RM** pendente (restrito — só com autorização) |
| 20 | Documentação de uso | docs técnicas criadas (esta pasta); falta manual do usuário final |

## ⬜ Não iniciados
| # | Subelemento |
|---|---|
| 19 | Criar Integração da Plataforma com Monday |
| 21 | Período de testes (formal) |
| 22 | Apresentação Final ao Líder do Setor |

## Escopo novo (surgiu no caminho)
- **Cadastro de atendentes (admin)** — backend pronto (`POST /usuarios/atendentes`);
  falta a tela no console.
- **Rotina de re-sincronização do RM** (ex.: diária).

## Próximos passos sugeridos
1. **Deploy na VM** (mover tudo para a rede interna) — ver [06-DEPLOY-VM](06-DEPLOY-VM.md).
2. **Chat/abrir-chamado no app mobile** (plugar `POST /chamados` + mensagens + tempo real).
3. Rotina de sync do RM + tela de cadastro de atendentes.
