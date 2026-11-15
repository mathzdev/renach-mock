# Mock das jornadas RENACH (renovação e primeira habilitação)

Protótipo navegável de duas jornadas, escolhidas no topo da tela:

- **Renovação (Motivo 5)**: Consulta 575 → Registro de Exame 181-E → Autorização de Emissão 159.
  Feita a partir da *Especificação Funcional — Frontend Mock da Jornada RENACH v1.0*.
- **Primeira habilitação (Motivo 1)**: Cadastrar Candidato 151 → Eventos 181 (cursos e exames com Tipo-Chave 1,
  Formulário RENACH) → Habilitar Candidato 155, com a Consulta 575 do candidato.

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

Deploy (Coolify ou qualquer Docker): veja [DEPLOY.md](DEPLOY.md). `docker build -t renach-mock . && docker run -p 3000:3000 renach-mock`.

Testes:

```bash
npm test           # 26 testes da API (renovação, primeira habilitação, falhas, idempotência, isolamento)
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
  Depois de substituir o Exame 03, registre um Exame 06 (I – Inclusão, resultado 1, entidade "Banca Examinadora Demonstrativa") e a autorização é liberada. Toxicológico recente (atendido).
- **CARLA · 90030360048** (cat. AB): bloqueio 2 – Suspensão não liberado; a 159 retorna 018 mesmo com exame novo.

### Primeira habilitação

1. Clique em **Primeira habilitação · Motivo 1**. Na tela de **Cadastro (TR 151)**, "Preencher com candidato fictício" monta
   um cadastro válido (BRUNO, formulário SP926060022). O aceite cria o candidato com Situação-CNH 0 – Inexistente e sem
   Número-Registro. Repetir o envio retorna 003; um CPF já cadastrado retorna 761.
2. Para não registrar todos os eventos à mão, use **"Continuar JULIA · SP926050011"**: a candidata da massa já tem os
   Exames 03, 04 e 05 e os Cursos 31 e 32. A tela de **Eventos** mostra o checklist do Motivo 1 e o que falta:
   Curso 34 (simulador, categoria B) e Exame 02 (prática 4 rodas).
3. Clique em "Curso 34", escolha o instrutor e registre. Depois clique em "Exame 02", escolha resultado, a examinadora e a
   banca, e registre. Entidade ou profissional incompatível com o evento retorna 662.
4. Em **Habilitação (TR 155)** a pré-validação lista os requisitos (316, 321, 322, 323, 590, 524, 763, 486, 345…).
   "Simular habilitação" leva a Situação-CNH a **1 – Emissão Autorizada**, com Primeira Habilitação = data da 155 e
   Permissão para Dirigir de 1 ano. Uma segunda habilitação retorna 015. O Número-Registro continua vazio: ele é gerado
   na emissão (TR 171, gráfica), fora do escopo.

Recarregar a página volta ao estado inicial. O botão "Reiniciar demonstração" faz o mesmo sem recarregar.

## API

Todas as rotas exigem o cabeçalho `X-Demo-Session` (o front gera um por carregamento de página).

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/catalogos` | Campos da TR 181, exames, resultados, restrições, clínicas e profissionais fictícios |
| GET | `/api/demo/prontuarios` | Lista da massa fictícia |
| POST | `/api/demo/reiniciar` | Restaura o estado inicial da sessão |
| GET | `/api/renach/575?tipoChave=1\|2\|7&numero=` | Consulta do prontuário (Tipo-Chave do Manual) |
| POST | `/api/renach/181` | Eventos: Tipo-Evento E (Exame) para condutor ou candidato; C (Curso) para candidato |
| POST | `/api/renach/151` | Cadastrar Candidato |
| POST | `/api/renach/155/prevalidar` | Requisitos da habilitação, sem alterar estado |
| POST | `/api/renach/155` | Simula a habilitação (Motivo 1) |
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
- Primeira habilitação: nome civil só com letras e ao menos dois nomes; Endereço-UF diferente da origem com código local
  POC-151-02 (a Consistência IV não tem código); estrangeiro fora do escopo (POC-151-01); Exame 05 precisa ser Apto (323);
  exames 03/04 inaptos com POC-155-01 (Consistência XIX sem código); categoria de candidato fora de A/B/AB/X/XB nos eventos com 345;
  evento de candidato já habilitado com 017; Observações-Curso só 99; compatibilidade evento × entidade × profissional (662)
  pelo quadro Tipo-Profissional × Tipo-Entidade.
- Não verificáveis (lacunas): infrações gravíssimas (RENAINF, fora do escopo), impedimentos/duplicidade na BINCO e imagens biométricas.
- Municípios usam códigos da tabela da Receita Federal, que o Manual não reproduz (massa demonstrativa).

Arquivos principais: `api/src/domain/tr181.campos.ts` (leiaute 181-E), `api/src/domain/leiautes.ts` (575, 159, 151, 155 e 181-C),
`api/src/domain/catalogos.ts` (tabelas e mensagens de retorno), `api/src/renach/renach.service.ts` (575, 181-E e 159) e
`api/src/renach/habilitacao.service.ts` (151, 181-C e 155).
