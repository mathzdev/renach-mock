# CLAUDE.md — Mock da jornada RENACH

Leia este arquivo inteiro antes de mexer em qualquer parte do projeto. Ele resume o que foi construído, as regras
que não podem ser quebradas e onde cada coisa mora. Responda ao usuário em português.

## 1. O que é

Protótipo navegável de **duas jornadas do domínio RENACH**, escolhidas no topo da tela:

- **Renovação (condutor)**: TR 575 – Consulta Prontuário → TR 181 – Eventos (Tipo-Evento E, Exame) → TR 159 – Autorizar Emissão CNH (Motivo 5)
- **Primeira habilitação (candidato)**: TR 151 – Cadastrar Candidato → TR 181 – Eventos C (Curso) e E (Exame) com Tipo-Chave 1
  (Número-Formulário-RENACH) → TR 155 – Habilitar Candidato (Motivo 1), mais a TR 575 por formulário

- Front React 18 + Vite + TypeScript (`web/`), API NestJS 10 (`api/`), "banco" em memória por sessão.
- Fonte normativa: **Manual RENACH v8.2 (julho de 2022)**. Fonte de requisitos de tela: *Especificação Funcional — Frontend Mock
  da Jornada RENACH v1.0*. O README tem o roteiro de demonstração.
- Tudo é fictício e local. Não existe integração com BCA, SENATRAN ou SERPRO.

## 2. Regras que nunca podem ser quebradas

1. **Nenhuma chamada externa.** O front só chama `/api` local; a API não chama nada. Não adicione SDKs, analytics, fontes ou CDNs.
2. **Nenhuma linguagem que sugira transmissão real ou validade jurídica.** Todo retorno de transação leva
   `transmissao: 'NENHUMA TRANSMISSÃO REALIZADA…'`; a interface mantém o selo "Ambiente Demonstrativo — Dados Fictícios".
3. **HAB-2026-118342 é processo estadual.** Pode aparecer só como `processoEstadualReferencia`. Nunca usar como Número-Registro
   nem como Número-Formulário-RENACH (a 575 devolve 752; a 159 devolve 802).
4. **Não misturar domínios.** Infração, AIT, multa, notificação e recurso são RENAINF. Veículo e gravame são RENAVAM/SNG.
   Esses manuais existem nos uploads do projeto, mas **não** são usados aqui. O que depende deles fica "não verificável".
5. **Não inventar regra nem código.** Se o Manual não sustenta algo, a regra é marcada `INTERPRETACAO_POC` ou `LACUNA`
   e, se precisar de código, usa `retPoc('xxx-nn', …)` (prefixo `POC-`). Códigos oficiais só via `ret('nnn')`.
6. **Falha não muta estado. Repetição não duplica.** 181 repetida → 395 (inclusão) ou 404 (substituição igual);
   159 repetida → 020; 155 repetida → 015; 151 repetida → 003. Só 151, 181, 159 e 155 aceitas alteram a sessão.
7. **Dados fictícios e mascarados.** CPF, CNPJ, Número-Registro e formulários usam prefixos artificiais (000/900/99) com
   dígitos verificadores válidos. Na tela operacional, CPF/CNPJ/documentos aparecem mascarados (`web/src/fmt.ts`);
   valores completos só no diagnóstico. Nunca coloque dados reais de pessoas.
8. **Escopo: 159 só Motivo 5; 155 só Motivo 1.** Outros motivos existem na tabela, mas a API responde 400 `POC-159-00` /
   `POC-155-00` (fora da tabela: 834). Motivo 1 na 159 → 400 `369`; condutor na 155 → 400 `009`.
   Candidato não tem Número-Registro (gerado na emissão, TR 171, fora do escopo): ele é identificado pelo formulário.
9. **Persistência só em memória.** Sem localStorage, arquivo ou banco. Recarregar a página = estado inicial.

## 3. Como rodar e verificar

```bash
npm install
npm run dev          # API :3000 + front :5173 (proxy /api)
npm start            # build e API servindo web/dist em :3000
npm test             # testes da API (jest + supertest), DEMO_HOJE=2026-11-14
npm run typecheck    # tsc da API e do front
npm run test:e2e     # Playwright: jornada em desktop e 390 px (precisa de `npm start` rodando)
docker build -t renach-mock .   # imagem única (API serve web/dist) usada no Coolify; ver DEPLOY.md
```

Deploy: `Dockerfile` na raiz, porta 3000, healthcheck `/api/saude`, uma réplica (estado em memória). A API escuta em
`HOST` (padrão `127.0.0.1`; a imagem usa `0.0.0.0`).

Antes de dizer que terminou: `npm run typecheck`, `npm test` e, se mexeu em tela, `npm run test:e2e`
(verifica overflow em 390 px, erros de console e chamadas externas). Atualize os testes junto com a regra.

## 4. Mapa do código

```
api/src/
  main.ts                    bootstrap; CORS só localhost; serve web/dist se existir
  app.module.ts              um módulo: RenachController + RenachService + DemoStoreService
  demo/demo-store.service.ts sessões em memória (Map), cabeçalho X-Demo-Session, TTL 2h, máx. 500
  domain/
    tipos.ts                 modelo do prontuário (espelha o Retorno 2 da 575), Validacao, Retorno, Fonte, SITUACOES_CNH
    catalogos.ts             tabelas do Manual (UF, categorias, exames, resultados por exame, observações, restrições A–Z,
                             motivos, Tipo-Chave), entidades/profissionais fictícios, municípios, validadores de CPF/CNPJ,
                             validade máxima por idade, MSG (mensagens oficiais) + ret() / retPoc()
    tr181.campos.ts          leiaute de envio da 181 Evento E (Tipo-Chave, Número, Tipo-Evento + 16 atributos, com posições)
    leiautes.ts              leiautes de envio da 575, 159, 151, 155 e 181-C (curso)
    fixtures.ts              massa fictícia (criarFixtures() devolve objetos novos a cada chamada)
    datas.ts                 datas ISO; hojeIso() respeita a env DEMO_HOJE
  renach/
    renach.controller.ts     rotas /api/...
    comum.ts                 regra(), primeiraFalha, clone, avisos de transmissão
    renach.service.ts        consultar575 (Tipo-Chave 1/2/7), registrar181/validar181 (Evento E, condutor e candidato),
                             prevalidar159/autorizar159/requisitos159, visao()
    habilitacao.service.ts   cadastrar151/validar151, registrarCurso181/validarCurso (Evento C), prevalidar155/habilitar155/requisitos155
  test/jornada.spec.ts       testes da API
web/src/
  App.tsx                    estado compartilhado entre etapas, stepper, cabeçalho do condutor, reiniciar
  api.ts                     fetch para /api com X-Demo-Session (UUID novo a cada carregamento)
  Consulta575.tsx            busca por Tipo-Chave e prontuário em blocos
  Registro181.tsx            formulário da 181 em grupos; validação local guiada por camposTr181 da API
  Autorizacao159.tsx         revisão, requisitos expansíveis, botão travado se houver impeditivo
  Cadastro151.tsx            formulário da 151 em grupos; atalhos "Continuar <candidato>" e "Preencher com candidato fictício"
  Eventos181.tsx             checklist do Motivo 1 (eventosExigidos), abas E (reusa Registro181, embutido) e C (RegistroCurso)
  Habilitacao155.tsx         revisão da 155 no mesmo padrão da 159
  componentes.tsx            Selo, StatusSelo, FonteSelo, Retorno, Secao, Campos, Tabela, Card, Confirmacao, Diagnostico
  fmt.ts                     datas BR, máscaras, rótulos de status e fonte
  estilo.css                 tokens de cor (claro/escuro), layout responsivo
e2e/jornada.e2e.mjs          teste de navegador
```

## 5. API

Todas as rotas exigem o cabeçalho `X-Demo-Session` (8 a 64 caracteres `[A-Za-z0-9-]`).

| Rota | Faz |
|---|---|
| `GET /api/catalogos` | camposTr181, exames, resultadosPorExame, observacoes, restricoes, categorias, situacoesCnh, tiposChave, motivosRequerimento, municipios, entidades, profissionais, ufs, ufOrigem, categoriasCandidato, modalidadesCurso, nacionalidades, tiposDocumentoIdentidade |
| `GET /api/demo/prontuarios` | atalhos da massa |
| `POST /api/demo/reiniciar` | recria as fixtures da sessão |
| `GET /api/renach/575?tipoChave=1\|2\|7&numero=` | `{ consulta, prontuario, diagnostico }` (rejeição também é HTTP 200) |
| `POST /api/renach/181` | `{ aceito, retorno, validacoes, camposComErro, evento, situacaoCnh, diagnostico }`; `tipoEvento: 'C'` vai para o Evento C |
| `POST /api/renach/151` | `{ aceito, retorno, validacoes, camposComErro, prontuario, diagnostico }` |
| `POST /api/renach/155/prevalidar` | `{ resumo, requisitos, podeHabilitar, pendencias }`, sem mutação |
| `POST /api/renach/155` | `{ habilitado, retorno, requisitos, prontuario, diagnostico }` |
| `POST /api/renach/159/prevalidar` | `{ resumo, requisitos, podeAutorizar, pendencias }`, sem mutação |
| `POST /api/renach/159` | `{ autorizado, retorno, requisitos, prontuario, diagnostico }` |

A rejeição de negócio volta como **200** com o código do Manual. HTTP 400 só para sessão inválida ou entrada da 159/155 que
não deixa nem montar o pedido (motivo, registro/formulário, natureza).

## 6. Modelo e massa

`Prontuario` segue o Retorno 2 da 575 e tem `natureza` ('1' Candidato, '2' Condutor) e `numeroRegistro` (null no candidato):
`dadosCadastrais`, `dadosControle` (situacaoCnh, situacaoCnhAnterior,
motivoRequerimento, categoriaAtual/Autorizada, dataValidadeCnh, observacaoCnh…), `toxicologico`, `exames` (**uma entrada por
Código-Exame**), `cursos`, `bloqueios`, `ocorrencias`, `emissoes` (HEMI), `hicom` (histórico de comandos) e `autorizacoes`.
A 575 devolve `visao(p)`: cópia com descrições e exames em ordem cronológica.

| Caso | Número-Registro | Para que serve |
|---|---|---|
| Marina Duarte Campos (cat. B) | 90011834250 | cenário principal: Exame 03 de 2021, CNH vencida em 10/03/2026, Situação 4 |
| Rogério Tavares Lima (cat. D) | 90020250096 | 1ª habilitação em 1984 (212) e CNH vencida há mais de 5 anos (372); toxicológico recente |
| Carla Mendes Rocha (cat. AB) | 90030360048 | bloqueio 2 – Suspensão não liberado (018) |
| Julia Ribeiro Santana (candidata, B) | formulário SP926050011 | 1ª habilitação: tem 03, 04, 05, Cursos 31 e 32; faltam Curso 34 (590) e Exame 02 (524). Datas relativas a "hoje" |

Candidato do botão "Preencher com candidato fictício": BRUNO TEIXEIRA ARAGAO, SP926060022, CPF 00000000604.
Livre para testes: CPF 00000000787.

Formulários da renovação em andamento: SP926004517, SP926020250, SP926030360. UF de origem da POC: `SP`.
Entidades: Clínica Horizonte 99000000000159, Clínica Aurora 99000001000101, Laboratório 99000002000148,
CFC Rota Certa 99000003000192, Banca Examinadora 99000004000137.
Profissionais: 90000000175 (médica, Horizonte), 90000000256 (psicólogo, Horizonte), 90000000337 (médica, Aurora),
90000000418 (instrutor, CFC), 90000000507 (examinadora de trânsito, Banca).
`eventoCompativel()` (catalogos.ts) aplica o 662: 03 = médico em clínica; 04 = psicólogo em clínica; 01/02/05/06/07 = banca
(examinador nos 01/02); cursos = CFC com instrutor.
Para criar um número fictício novo, gere dígitos verificadores válidos (CPF/Número-Registro: `digitosCpfValidos`;
CNPJ: `cnpjValido`).

## 7. Regras por transação (resumo; detalhe em `renach.service.ts` e `habilitacao.service.ts`)

**575**: Tipo-Chave 2 (Registro: DV inválido 752, inexistente 016), 7 (CPF: 830, 525), 1 (Formulário: 802/801; de condutor 375;
inexistente 006); outro Tipo-Chave 890.

**181 (Evento E)**: Tipo-Chave 1 para condutor 375; 752/016; UF domínio 011; 376/377; Código-Exame 407; Data-Exame 408
(≤ hoje); Resultado pela tabela do exame 409 (03: 1/2/4/5; 04: 1/2/3; demais: 1/2); Data-Validade 473 (obrigatória no 03 e no
04 com obs. 15; máx. 10/5/3 anos pela idade a partir de 12/04/2021; Inapto Temporário = término da inaptidão);
CPF-Examinador 410/411 (dispensado em 05/06/07); CNPJ 399; cadastro 611; vínculo 639; UF/município 402/401/392;
categorias 412/413/388 e 384/385; categoria total nos 03/04 → 346 (interpretação); Observações 414/415/416/417/214;
laboratório/laudo 664/665; chave do evento: Inclusão com exame existente 395, Substituição sem exame 403, sem mudança 404.
Aceita: inclui ou substitui o exame, grava HICOM e, se mudou validade ou observação impressa, Situação-CNH 4/5 → 6
(volta para 4/5 se os dados voltarem iguais à CNH).

**159 (Motivo 5)**, nesta ordem: 011; Situação já 1 → 020; Situação 2/3 → 017 (interpretação); Formulário 802/801/804 e já
usado 003; Categoria 837 e ≠ atual 982; bloqueio 018; endereço 373; **Exame 03 apto, vigente e posterior à última emissão → 330**;
outro exame inapto → POC-159-01; 1ª habilitação < 21/01/1998 → Curso 30 ou Exame 06 (212); CNH vencida > 5 anos → Curso 30
ou Exame 06 após a última emissão (372); Exame 04 opcional (informativo); toxicológico C/D/E 668/686/666/669; Tipo de
Autorização 660 e, se 2, DDD/celular/e-mail 701/702/644; Data-Validade da nova CNH 838 (menor entre 03 e 04).
Não verificáveis: infrações gravíssimas D/E (RENAINF), impedimentos BINCO, biometria.
Aceita: Situação-CNH → 1, anterior guardada, motivo 5, formulário e categoria autorizada atualizados, autorização + HICOM.

**151**: Formulário 802/801/804 e já existente 003; nome 805; nascimento 809 e menor de 18 311; sexo 812; mãe em branco 300 e
inválida 814; pai 301; documento 818/819; CPF 830 e já na base 761; localidade 832; nacionalidade 835 (3 → POC-151-01);
endereço 302/304/305/306/307/308 e UF ≠ origem POC-151-02; Data-Cadastramento 810; contato 701/702/644; nome social 971;
filiação afetiva 972; nome+documento 004; nome+nascimento+mãe 073. Indícios por semelhança (920–968): não verificável.
Aceita: cria prontuário natureza 1, Situação-CNH 0, `formularioRenachEmAndamento` = formulário, HICOM 151.

**181 do candidato** (Tipo-Chave 1): formulário 802/801, de condutor 375, inexistente 006; candidato já habilitado 017
(interpretação); Evento E igual ao do condutor, mas categoria só A/B/AB/X/XB (345, interpretação) e sem mexer na Situação-CNH.
Evento C (cursos 31–34): 377, 396, Modalidade 222/390, certificado 479, datas 397/398, carga 391/472 (34: minutos ≥ 150, 593),
CNPJ 399, CPF-Instrutor 400, cadastro 611, vínculo 639, compatibilidade 662, UF/município 402/401/392, Data-Validade 473,
categoria 394/837/382/383 (32 de candidato só B: 345), Observações-Curso só 99 (414, interpretação), Curso 34 exige
03/04/05/31 (592) e Exame 03 com B (594); chave 395/403/404.

**155 (Motivo 1)**, nesta ordem: 011; já habilitado 015; categoria 837 e fora de A/B/AB/X/XB 486; bloqueio 010;
cadastro + 1 ano e 60 dias 763; Primeira Habilitação = data da 155 (529, sempre atendido); Curso 31 316; Exame 05 323;
Exame 03 vigente 321; Exame 04 vigente 322; 03/04 inapto POC-155-01; Curso 34 para B com cadastro ≥ 06/01/2014 590;
prática por categoria (2 rodas: Curso 33 + Exame 01; 4 rodas: Curso 32 + Exame 02) 524; categoria coberta pelos exames 345;
660/701/702/644; Data-Validade 838 (= data da 155 + 1 ano, ou a menor validade dos 03/04).
Aceita: Situação-CNH 0 → 1, motivo 1, permissionário 1, categoriaAutorizada, dataValidadeCnh, primeiraHabilitacao = hoje;
Categoria-Atual fica em branco (Consistência XIII); autorização transacao '155' + HICOM.

## 8. Convenções

- **Toda regra é uma `Validacao`** com `id`, `titulo`, `status` (`ATENDIDO | NAO_ATENDIDO | NAO_VERIFICAVEL | NAO_APLICAVEL`),
  `impeditivo`, `detalhe`, `fonte` (`MANUAL | FIXTURE | INTERPRETACAO_POC | LACUNA`), `referencia` (ex.: `TR 159 · Consistência V.3 ·
  cód. 330`), `campos` (para destacar no front) e `codigoRetorno`. O retorno da transação é o código da **primeira** regra
  impeditiva não atendida, então a ordem das regras importa.
- **Ausência de dado não vira reprovação oficial**: use `NAO_VERIFICAVEL` + `LACUNA`, não impeditivo.
- **Diagnóstico** de cada transação: transacao, origemDestino, chave, numero, condicionalidade, leiaute ou leiauteEnvio,
  payload, validacoes, retorno, estadoAnterior/Posterior, mutacao, transmissao, e `interpretacoes`/`lacunas` quando houver.
  O componente `Diagnostico` agrupa as validações pelas quatro fontes.
- Datas internas em ISO `yyyy-mm-dd`; na tela, `br()`. Nunca use `new Date()` direto para "hoje" na API: use `hojeIso()`.
- Rótulos na tela em linguagem natural ("Número do formulário RENACH", "Situação da CNH"), sem os hifens do Manual; o nome
  oficial fica em `nomeManual` (181) e no diagnóstico. Mensagens de retorno (`MSG`) continuam com o texto oficial.
- A tela abre em modo apresentação: posições de leiaute (`.pos`), sequência (`.seq`), referências (`.ref`), notas de leiaute
  (`.nota-tecnica`) e o `Diagnostico` só aparecem com "Detalhes técnicos" ligado no cabeçalho.
- Textos de interface em português, operacionais, sem prometer transmissão. Toda ação simulada passa por `Confirmacao`.
- Layout: nada pode causar overflow horizontal em 390 px; tabela larga vai dentro de `.tabela-rolagem`.

## 9. Receitas

- **Nova consistência na 181/159**: ache o trecho no Manual (`MANUAL_RENACH_V8.2.txt` nos uploads; seções "181 – EVENTOS",
  "159 – AUTORIZAR EMISSÃO CNH" e a tabela "REGRAS DO CÓDIGO DE RETORNO"), adicione a mensagem em `MSG` (`catalogos.ts`)
  com o texto oficial, crie a `Validacao` no ponto certo da ordem em `validar181`/`requisitos159`, adicione teste em
  `jornada.spec.ts` (sucesso e falha sem mutação).
- **Novo campo de leiaute**: `tr181.campos.ts` ou `leiautes.ts` (posição, tamanho, formato, obrigatoriedade), normalização em
  `normalizar181`/`entrada159`, input no componente do front com `campo(...)`, e regra correspondente.
- **Novo caso de massa**: em `fixtures.ts`, mantendo coerência entre exames, emissões (HEMI), validade da CNH e Situação-CNH;
  inclua o rótulo em `listarDemonstrativos`.
- **Novo motivo da 159/155**: fora do escopo atual. Só faça se o usuário pedir; comece pelos quadros "Curso x Motivo" e
  "Exame x Motivo" do Manual (seção 155) e ajuste `entrada159`/`entrada155`.
- **Nova tela/bloco**: siga os componentes existentes (`Secao`, `Campos`, `Tabela`, `Card`), mascarando documentos.

## 10. Armadilhas conhecidas

- Os testes fixam `DEMO_HOJE=2026-11-14`. Sem essa env, "hoje" é a data real: a CNH da Marina e o toxicológico do Rogério
  (coleta = hoje − 20 dias) dependem disso.
- O formulário da 181 usa `tipoChave` e `numero` (não `numeroRegistro`). A 159 usa `numeroRegistro` e `motivoRequerimento`;
  a 155 usa `numeroFormularioRenach` e `motivoRequerimento`.
- No candidato, `numeroRegistro`, `primeiraHabilitacao`, `dataValidadeCnh` e `dataUltimaEmissaoHistorico` são null e
  `categoriaAtual` é ''. Ache o prontuário pela chave certa (`chaveDe` no App; `natureza` na API) e não por `numeroRegistro`.
- O diagnóstico usa `leiaute` (formato de `CAMPOS_TR181`) ou `leiauteEnvio` (formato `CampoLeiaute`); trocar um pelo outro quebra a tela.
- A jornada do App segue a natureza do prontuário consultado (consultar um candidato muda para "Primeira habilitação").
- `Observações` trafega como array de códigos; no payload do diagnóstico vira texto de 2 posições por código (`"A "`, `"99"`).
- O estado da tela é derivado do prontuário devolvido pela API; depois de 181/159 aceitas o `App` reconsulta a 575.
- `web/tsconfig.tsbuildinfo` é artefato de build; não precisa versionar.
