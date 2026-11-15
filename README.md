# Mock da jornada RENACH (renovação de CNH)

Protótipo navegável da jornada **Consulta 575 → Registro de Exame 181-E → Autorização de Emissão 159 (Motivo 5)**,
feito a partir da *Especificação Funcional — Frontend Mock da Jornada RENACH v1.0*.

> **Ambiente demonstrativo, dados fictícios.** Nenhuma comunicação com BCA, SENATRAN ou SERPRO. Nada é gravado em disco.

## Stack

| Parte | Tecnologia | Pasta |
|---|---|---|
| Front-end | React 18 + Vite + TypeScript (CSS próprio, sem biblioteca de UI) | `web/` |
| API | NestJS 10 | `api/` |
| "Banco" mock | Em memória, uma cópia das fixtures por sessão do navegador | `api/src/domain/fixtures.ts` |

## Como rodar

Pré-requisito: Node 18 ou mais recente.

```bash
npm install
npm run dev        # API em :3000 e front em http://localhost:5173 (com hot reload)
```

Ou em modo "produção", com a API servindo o front já compilado:

```bash
npm start          # http://localhost:3000
```

Testes:

```bash
npm test           # 19 testes da API (sucesso, falhas, idempotência, isolamento, fluxo integrado)
npm run typecheck
# Teste no navegador (desktop + celular 390 px), com `npm start` rodando:
npm i -D playwright && npx playwright install chromium
npm run test:e2e
```

## Roteiro de demonstração

1. **Consulta 575**: clique em "MARINA · 90011834250". O prontuário aparece nos blocos do Retorno 2 da 575 (Situação-CNH 4 – Confirmada).
   O Exame 03 é de 10/03/2021, anterior à última emissão, e a CNH venceu em 10/03/2026.
   O botão "Testar com HAB-2026-118342" mostra o retorno 752 (o processo estadual não é Número-Registro).
2. **Exame (TR 181)**: o formulário já vem como Tipo-Chave 2, Tipo-Atualização S (o prontuário só pode ter um Exame 03).
   Escolha o resultado, use "Máximo (10 anos)" na Data-Validade, selecione examinador e clínica e registre.
   A Situação-CNH vai para 6 – Alterada. Repetir o mesmo envio retorna 404; usar I – Inclusão retorna 395.
3. Volte à **Consulta**: o Exame 03 aparece como "Simulação TR 181", sem duplicar.
4. **Autorização (TR 159)**: a pré-validação lista os requisitos com o código de retorno oficial de cada um.
   "Simular autorização" só fica habilitado sem pendências impeditivas.
5. Após o sucesso (000), a Consulta 575 mostra **Situação-CNH 1 – Emissão Autorizada**. Uma segunda autorização retorna 020.

Outros casos da massa:

- **ROGERIO · 90020250096** (cat. D): 1ª habilitação em 1984 (retorno 212) e CNH vencida há mais de 5 anos (372).
  Depois de substituir o Exame 03, registre um Exame 06 (I – Inclusão, resultado 1) e a autorização é liberada. Toxicológico recente (atendido).
- **CARLA · 90030360048** (cat. AB): bloqueio 2 – Suspensão não liberado; a 159 retorna 018 mesmo com exame novo.

Recarregar a página volta ao estado inicial. O botão "Reiniciar demonstração" faz o mesmo sem recarregar.

## API

Todas as rotas exigem o cabeçalho `X-Demo-Session` (o front gera um por carregamento de página).

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/catalogos` | Campos da TR 181, exames, resultados, restrições, clínicas e profissionais fictícios |
| GET | `/api/demo/prontuarios` | Lista da massa fictícia |
| POST | `/api/demo/reiniciar` | Restaura o estado inicial da sessão |
| GET | `/api/renach/575?tipoChave=1\|2\|7&numero=` | Consulta do prontuário (Tipo-Chave do Manual) |
| POST | `/api/renach/181` | Registro de Exame (Tipo-Evento E) |
| POST | `/api/renach/159/prevalidar` | Requisitos da autorização, sem alterar estado |
| POST | `/api/renach/159` | Simula a autorização (Motivo 5) |

Toda resposta de transação traz um bloco `diagnostico` com transação, chave, payload, validações, retorno,
estado anterior/posterior e o aviso de que não houve transmissão.

## O que vem do Manual e o que é interpretação

As regras seguem o **Manual RENACH v8.2 (julho de 2022)**: leiautes de envio da 575, 181 (Evento E) e 159 com posições,
tabelas pré-codificadas (Situação-CNH, Tipo-Chave, Código-Exame, Resultados por exame, Observações, Restrições médicas, Categorias,
Motivo-Requerimento) e códigos de retorno oficiais. Cada validação traz no diagnóstico a origem (ex.: "TR 159 · Consistência V.3 · cód. 330").

Ainda são interpretação da POC (marcadas na tela e no diagnóstico):

- 181: Apto com Restrições sem restrição médica (POC-181-01), restrição com resultado inapto (POC-181-02), texto X sem observação X (POC-181-03),
  categoria total nos exames 03/04 tratada como igual à Categoria-Atual (346).
- 159: outro exame inapto no prontuário (observação 11, sem código: POC-159-01); 017 aplicado à 159 com Situação-CNH 2 ou 3;
  372 aceita Curso 30 ou Exame 06 (o código cita só o Curso 30, o quadro Curso x Motivo admite os dois);
  toxicológico exigido para C, D e E.
- Não verificáveis (lacunas): infrações gravíssimas (RENAINF, fora do escopo), impedimentos/duplicidade na BINCO e imagens biométricas.
- Municípios usam códigos da tabela da Receita Federal, que o Manual não reproduz (massa demonstrativa).

Arquivos principais: `api/src/domain/tr181.campos.ts` (leiaute 181), `api/src/domain/leiautes.ts` (575 e 159),
`api/src/domain/catalogos.ts` (tabelas e mensagens de retorno) e `api/src/renach/renach.service.ts` (regras).
