# Integração com o RM (TOTVS)

> 🔒 **O RM é tratado como SOMENTE LEITURA.** O backend só faz `GET` na Consulta SQL.
> Nada é criado/alterado/escrito no RM. Os dados vão apenas para o NOSSO Postgres.

## Como funciona
1. Uma **Consulta SQL** registrada no RM retorna os funcionários (CONTATO/JCF) com CPF/chapa/função.
2. O backend chama o **web service do RM** (`consultaSQLServer/RealizaConsulta`) e
   **sincroniza** todos para a tabela `usuarios` (como colaboradores, `senhaDefinida=false`).
3. No **1º acesso**, o colaborador digita o CPF → o backend acha o registro já sincronizado
   (nome real do RM) → define a senha.

Endpoint para disparar: `POST /api/integracao/sincronizar-rm` (logado como supervisor).
Recomendado agendar (ex.: 1×/dia) para manter os nomes atualizados.

## A Consulta SQL
- Código: `Direct.02` · Coligada: `0` (todas) · Sistema: `V`.
- Retorna as colunas: `Coligada, Chapa, Nome, CPF, Função, Situação` (o parser ignora
  acento/caixa e usa `Função` como setor). Validado: **1.575 funcionários**.

## Configuração (.env do backend — NÃO versionar)
```
RM_FAKE=false
RM_API_URL=https://contatoservicos165112.rm.cloudtotvs.com.br:8051
RM_API_USER=<usuario_rm>            # ideal: usuário de integração SÓ LEITURA
RM_API_PASS=<senha_rm>
RM_CONSULTA_COD=Direct.02
RM_COLIGADA=0
RM_SISTEMA=V
```
Com `RM_FAKE=true` o backend simula o RM (dev, sem credenciais).

A URL final é:
`{RM_API_URL}/api/framework/v1/consultaSQLServer/RealizaConsulta/{RM_CONSULTA_COD}/{RM_COLIGADA}/{RM_SISTEMA}/`
Autenticação: **Basic** (usuário/senha do RM).

## O que NÃO está integrado (de propósito)
- **Buscar marcações de ponto** (consultarPonto) — ainda stub.
- **Gravar o ajuste aprovado na folha (RM Labore)** — é a única operação de **escrita**
  no RM. **Não implementar sem autorização da TI/TOTVS** e por um mecanismo oficial
  (processo do RM ou n8n controlado).
