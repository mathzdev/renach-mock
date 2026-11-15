// Teste ponta a ponta da jornada no navegador (desktop e celular 390 px).
// Pré-requisitos: `npm start` rodando (API + front em http://localhost:3000)
// e Playwright disponível (`npm i -D playwright && npx playwright install chromium`).
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SHOTS = new URL('./screens/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const falhas = [];
const ok = (cond, msg) => { if (!cond) falhas.push(msg); console.log(`${cond ? '✓' : '✗'} ${msg}`); };

async function semOverflow(page, rotulo) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(r.sw <= r.cw, `${rotulo}: sem overflow horizontal (${r.sw} <= ${r.cw})`);
}

async function jornada(browser, nome, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const erros = [];
  const externas = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));
  page.on('request', (r) => { if (!r.url().startsWith(BASE)) externas.push(r.url()); });

  await page.goto(BASE);
  await page.getByText('Ambiente Demonstrativo — Dados Fictícios').waitFor();

  // 1 · Consulta 575 — HAB recusado e prontuário localizado
  await page.getByRole('button', { name: /Testar com HAB/ }).click();
  await page.getByText('Número de Registro Inválido.').first().waitFor();
  ok(true, `[${nome}] HAB-2026-118342 recusado como chave (752)`);
  await page.getByRole('button', { name: /^MARINA|Marina|MARINA/ }).first().click();
  await page.getByText('LOCALIZADO', { exact: true }).first().waitFor();
  ok(await page.getByText('Eventos — Exames (4) e Cursos (2)').isVisible(), `[${nome}] 575 mostra exames e cursos da massa`);
  ok(await page.getByText('4 – Confirmada').first().isVisible(), `[${nome}] Situação-CNH inicial 4 – Confirmada`);
  await semOverflow(page, `[${nome}] Consulta 575`);
  await page.screenshot({ path: `${SHOTS}${nome}-1-consulta.png`, fullPage: true });

  // 2 · Registrar exame (181)
  await page.getByRole('button', { name: /Registrar exame \(TR 181\)/ }).click();
  await page.getByRole('button', { name: 'Registrar exame (simulação)' }).click();
  ok(await page.getByText('Campo obrigatório.').first().isVisible(), `[${nome}] 181 exibe erros junto aos campos`);
  await page.getByLabel(/Resultado/).first().selectOption('1');
  await page.getByRole('button', { name: /Máximo/ }).click();
  await page.getByLabel(/Examinador \(cadastro/).selectOption({ index: 1 });
  await page.getByLabel(/Entidade credenciada \(fictícia/).selectOption({ index: 1 });
  await semOverflow(page, `[${nome}] Registro 181`);
  await page.screenshot({ path: `${SHOTS}${nome}-2-exame.png`, fullPage: true });
  await page.getByRole('button', { name: 'Registrar exame (simulação)' }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Registrar exame (simulação)' }).click();
  await page.getByRole('heading', { name: 'Aceito na simulação' }).first().waitFor();
  ok(true, `[${nome}] 181 aceito na simulação`);
  // repetição → duplicidade
  await page.getByRole('button', { name: 'Registrar exame (simulação)' }).first().click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Registrar exame (simulação)' }).click();
  await page.getByText('Dados não Divergem dos Cadastrados na BINCO/BCA.').first().waitFor();
  ok(true, `[${nome}] 181 repetido é rejeitado (404)`);

  // 3 · Conferir 575
  await page.getByRole('button', { name: /Consulta/ }).first().click();
  ok(await page.getByText('Eventos — Exames (4) e Cursos (2)').isVisible(), `[${nome}] 575 reflete o Exame 03 substituído sem duplicar`);
  ok(await page.getByText('6 – Alterada').first().isVisible(), `[${nome}] Situação-CNH 6 – Alterada após a 181`);
  ok(await page.getByText('Simulação TR 181').first().isVisible(), `[${nome}] evento identificado como Simulação TR 181`);

  // 4 · Autorização 159
  await page.getByRole('button', { name: /Autorização/ }).first().click();
  await page.getByText('Liberada').first().waitFor();
  await semOverflow(page, `[${nome}] Autorização 159`);
  await page.screenshot({ path: `${SHOTS}${nome}-3-autorizacao.png`, fullPage: true });
  await page.getByRole('button', { name: 'Simular autorização' }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Simular autorização' }).click();
  await page.getByRole('heading', { name: 'Aceito na simulação' }).first().waitFor();
  ok(await page.getByRole('button', { name: 'Simular autorização' }).isDisabled(), `[${nome}] repetição da 159 fica bloqueada`);

  // 5 · Resultado na 575
  await page.getByRole('button', { name: 'Ver resultado na Consulta 575' }).click();
  await page.getByText('1 – Emissão Autorizada').first().waitFor();
  ok(true, `[${nome}] 575 mostra Situação-CNH 1 — Emissão Autorizada`);
  await page.screenshot({ path: `${SHOTS}${nome}-4-final.png`, fullPage: true });

  // Recarregar volta ao estado inicial
  await page.reload();
  await page.getByRole('button', { name: /MARINA|Marina/ }).first().click();
  await page.getByText('4 – Confirmada').first().waitFor();
  ok(true, `[${nome}] recarregar a página volta ao estado inicial`);

  ok(erros.length === 0, `[${nome}] sem erros de console ${erros.length ? JSON.stringify(erros) : ''}`);
  ok(externas.length === 0, `[${nome}] nenhuma chamada externa ${externas.length ? JSON.stringify(externas) : ''}`);
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await jornada(browser, 'desktop', { width: 1366, height: 900 });
  await jornada(browser, 'celular', { width: 390, height: 844 });
} catch (e) {
  falhas.push(String(e));
  console.error(e);
} finally {
  await browser.close();
}
console.log(falhas.length ? `\n${falhas.length} falha(s).` : '\nJornada OK em desktop e celular.');
process.exit(falhas.length ? 1 : 0);
