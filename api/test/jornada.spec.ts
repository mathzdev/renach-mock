import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

process.env.DEMO_HOJE = '2026-11-14';

const MARINA = '90011834250';
const ROGERIO = '90020250096';
const CARLA = '90030360048';

const exameMarina = (extra: Record<string, unknown> = {}) => ({
  tipoChave: '2',
  numero: MARINA,
  tipoEvento: 'E',
  tipoAtualizacao: 'S',
  codigoExame: '03',
  dataExame: '2026-11-10',
  resultado: '2',
  dataValidade: '2036-11-10',
  cpfExaminador1: '90000000175',
  cnpjEntidadeCredenciada: '99000000000159',
  municipioExame: '07107',
  ufExame: 'SP',
  categoriaPretendida: 'B',
  categoriaPermitida: 'B',
  observacoes: ['A'],
  ...extra,
});
const pedido159 = { numeroRegistro: MARINA, numeroFormularioRenach: 'SP926004517', motivoRequerimento: '5', categoria: 'B', tipoAutorizacao: '1' };
const req = (r: any[], id: string) => r.find((x) => x.id === id);

describe('Jornada RENACH (API demonstrativa, regras do Manual v8.2)', () => {
  let app: INestApplication;
  let seq = 0;
  const nova = () => `sessao-teste-${Date.now()}-${++seq}`;
  const api = (s: string) => ({
    get: (url: string) => request(app.getHttpServer()).get(url).set('X-Demo-Session', s),
    post: (url: string, body: object = {}) => request(app.getHttpServer()).post(url).set('X-Demo-Session', s).send(body),
  });
  const c575 = (a: ReturnType<typeof api>, tipo: string, numero: string) => a.get(`/api/renach/575?tipoChave=${tipo}&numero=${encodeURIComponent(numero)}`);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('exige cabeçalho de sessão', async () => {
    await request(app.getHttpServer()).get(`/api/renach/575?tipoChave=2&numero=${MARINA}`).expect(400);
  });

  describe('TR 575', () => {
    it('localiza por Número-Registro (2) e CPF (7)', async () => {
      const a = api(nova());
      for (const [tipo, numero] of [['2', MARINA], ['7', '000.000.001-91']]) {
        const r = await c575(a, tipo, numero).expect(200);
        expect(r.body.consulta.retorno.codigo).toBe('000');
        expect(r.body.prontuario.dadosCadastrais.nomeCondutorCivil).toBe('MARINA DUARTE CAMPOS');
        expect(r.body.prontuario.dadosControle.situacaoCnh).toBe('4');
      }
    });

    it('recusa HAB como Número-Registro (752) e formulário de condutor (375)', async () => {
      const a = api(nova());
      const hab = await c575(a, '2', 'HAB-2026-118342');
      expect(hab.body.consulta.retorno).toMatchObject({ codigo: '752', origemCodigo: 'MANUAL' });
      expect(hab.body.prontuario).toBeNull();
      const form = await c575(a, '1', 'SP926004517');
      expect(form.body.consulta.retorno.codigo).toBe('375');
    });

    it('retornos 016, 830, 525 e 890', async () => {
      const a = api(nova());
      expect((await c575(a, '2', '12345678909')).body.consulta.retorno.codigo).toBe('016');
      expect((await c575(a, '7', '12345678900')).body.consulta.retorno.codigo).toBe('830');
      expect((await c575(a, '7', '12345678909')).body.consulta.retorno.codigo).toBe('525');
      expect((await c575(a, '9', '1')).body.consulta.retorno.codigo).toBe('890');
    });
  });

  describe('TR 181-E', () => {
    it('substitui o Exame 03, reflete na 575 e muda Situação-CNH para 6 – Alterada', async () => {
      const a = api(nova());
      const r = await a.post('/api/renach/181', exameMarina()).expect(200);
      expect(r.body.aceito).toBe(true);
      expect(r.body.retorno.codigo).toBe('000');
      expect(r.body.situacaoCnh).toEqual({ antes: '4', depois: '6' });
      const c = await c575(a, '2', MARINA);
      const ex03 = c.body.prontuario.exames.filter((e: any) => e.codigoExame === '03');
      expect(ex03).toHaveLength(1);
      expect(ex03[0]).toMatchObject({ dataExame: '2026-11-10', procedencia: 'SIMULACAO_TR181' });
    });

    it('inclusão de exame já registrado retorna 395; repetição da substituição retorna 404', async () => {
      const a = api(nova());
      expect((await a.post('/api/renach/181', exameMarina({ tipoAtualizacao: 'I' }))).body.retorno.codigo).toBe('395');
      await a.post('/api/renach/181', exameMarina()).expect(200);
      const rep = await a.post('/api/renach/181', exameMarina());
      expect(rep.body.aceito).toBe(false);
      expect(rep.body.retorno.codigo).toBe('404');
      const c = await c575(a, '2', MARINA);
      expect(c.body.prontuario.exames.filter((e: any) => e.codigoExame === '03')).toHaveLength(1);
    });

    it('substituição de exame inexistente retorna 403', async () => {
      const r = await api(nova()).post('/api/renach/181', exameMarina({ codigoExame: '06', tipoAtualizacao: 'S', resultado: '1', dataValidade: '', observacoes: ['99'], cpfExaminador1: '' }));
      expect(r.body.retorno.codigo).toBe('403');
    });

    it('aplica tabelas e consistências do Evento E', async () => {
      const a = api(nova());
      const cod = async (x: Record<string, unknown>) => (await a.post('/api/renach/181', exameMarina(x))).body.retorno.codigo;
      expect(await cod({ resultado: '3' })).toBe('409');
      expect(await cod({ dataValidade: '' })).toBe('473');
      expect(await cod({ dataValidade: '2037-11-10' })).toBe('473'); // acima de 10 anos
      expect(await cod({ resultado: '1' })).toBe('417'); // restrição A com Apto
      expect(await cod({ observacoes: ['99', 'A'] })).toBe('415');
      expect(await cod({ observacoes: ['X'] })).toBe('214');
      expect(await cod({ observacoes: ['15'] })).toBe('414'); // 15 só no exame 04
      expect(await cod({ categoriaPermitida: 'D', categoriaPretendida: 'B' })).toBe('388');
      expect(await cod({ municipioExame: '06291', ufExame: 'RJ' })).toBe('392');
      expect(await cod({ cpfExaminador1: '90000000337' })).toBe('639'); // médica de outra clínica
      expect(await cod({ dataExame: '2027-01-01' })).toBe('408');
      expect(await cod({ tipoChave: '1', numero: 'SP926004517' })).toBe('375');
      expect(await cod({ numero: 'HAB2026118342' })).toBe('752');
    });

    it('falhas não alteram o estado', async () => {
      const a = api(nova());
      await a.post('/api/renach/181', exameMarina({ resultado: '3' }));
      const c = await c575(a, '2', MARINA);
      expect(c.body.prontuario.exames.find((e: any) => e.codigoExame === '03').dataExame).toBe('2021-03-10');
      expect(c.body.prontuario.dadosControle.situacaoCnh).toBe('4');
    });
  });

  describe('TR 159 — Motivo 5', () => {
    it('aceita somente o motivo 5 e recusa motivo fora da tabela', async () => {
      const a = api(nova());
      await a.post('/api/renach/159/prevalidar', { ...pedido159, motivoRequerimento: '6' }).expect(400);
      const r = await a.post('/api/renach/159/prevalidar', { ...pedido159, motivoRequerimento: 'Q' }).expect(400);
      expect(r.body.codigo).toBe('834');
    });

    it('sem novo Exame 03 retorna 330 e não altera estado', async () => {
      const a = api(nova());
      const pv = await a.post('/api/renach/159/prevalidar', pedido159).expect(200);
      expect(pv.body.podeAutorizar).toBe(false);
      expect(req(pv.body.requisitos, 'R08').codigoRetorno.codigo).toBe('330');
      const r = await a.post('/api/renach/159', pedido159).expect(200);
      expect(r.body.autorizado).toBe(false);
      expect(r.body.retorno.codigo).toBe('330');
      expect(r.body.prontuario.dadosControle.situacaoCnh).toBe('4');
    });

    it('Exame 03 Inapto retorna 330', async () => {
      const a = api(nova());
      await a.post('/api/renach/181', exameMarina({ resultado: '5', dataValidade: '', observacoes: ['99'], categoriaPermitida: '' })).expect(200);
      const r = await a.post('/api/renach/159', pedido159);
      expect(r.body.retorno.codigo).toBe('330');
    });

    it('formulário HAB (802), já usado (003), categoria diferente (982)', async () => {
      const a = api(nova());
      await a.post('/api/renach/181', exameMarina());
      const cod = async (x: Record<string, unknown>) => (await a.post('/api/renach/159', { ...pedido159, ...x })).body.retorno.codigo;
      expect(await cod({ numeroFormularioRenach: 'HAB-2026-118342' })).toBe('802');
      expect(await cod({ numeroFormularioRenach: 'SP921003318' })).toBe('003');
      expect(await cod({ numeroFormularioRenach: 'RJ926004517' })).toBe('804');
      expect(await cod({ categoria: 'AB' })).toBe('982');
      expect(await cod({ tipoAutorizacao: '2' })).toBe('701');
    });

    it('fluxo integrado: 575 → 181 → 575 → 159 → 575 com Situação-CNH 1; repetição retorna 020', async () => {
      const a = api(nova());
      await c575(a, '2', MARINA).expect(200);
      expect((await a.post('/api/renach/181', exameMarina())).body.aceito).toBe(true);
      const pv = await a.post('/api/renach/159/prevalidar', pedido159);
      expect(pv.body.podeAutorizar).toBe(true);
      expect(pv.body.resumo.dataValidadeNovaCnh).toBe('2036-11-10');
      expect(req(pv.body.requisitos, 'R11').status).toBe('NAO_APLICAVEL');
      const r = await a.post('/api/renach/159', pedido159);
      expect(r.body.autorizado).toBe(true);
      expect(r.body.retorno).toMatchObject({ codigo: '000', origemCodigo: 'MANUAL' });
      expect(r.body.diagnostico.payload.observacoes).toBe('A ');
      const c = await c575(a, '2', MARINA);
      expect(c.body.prontuario.dadosControle).toMatchObject({ situacaoCnh: '1', situacaoCnhAnterior: '6', numeroFormularioRenach: 'SP926004517' });
      expect(c.body.prontuario.processoEstadualReferencia).toBe('HAB-2026-118342');

      const repete = await a.post('/api/renach/159', pedido159);
      expect(repete.body.autorizado).toBe(false);
      expect(repete.body.retorno.codigo).toBe('020');
      expect(repete.body.prontuario.autorizacoes).toHaveLength(1);
    });

    it('Rogério: 1ª habilitação < 1998 (212) e CNH vencida > 5 anos (372); Exame 06 resolve', async () => {
      const a = api(nova());
      const base = { ...exameMarina(), numero: ROGERIO, categoriaPretendida: 'D', categoriaPermitida: 'D', resultado: '1', observacoes: ['99'], dataValidade: '2031-11-10' };
      expect((await a.post('/api/renach/181', base)).body.aceito).toBe(true);
      const p159 = { numeroRegistro: ROGERIO, numeroFormularioRenach: 'SP926020250', motivoRequerimento: '5', categoria: 'D', tipoAutorizacao: '1' };
      let pv = await a.post('/api/renach/159/prevalidar', p159);
      expect(req(pv.body.requisitos, 'R10').codigoRetorno.codigo).toBe('212');
      expect(req(pv.body.requisitos, 'R11').codigoRetorno.codigo).toBe('372');
      expect(req(pv.body.requisitos, 'R13').status).toBe('ATENDIDO'); // toxicológico recente
      expect(req(pv.body.requisitos, 'R19').status).toBe('NAO_VERIFICAVEL'); // RENAINF
      const ex06 = { ...base, tipoAtualizacao: 'I', codigoExame: '06', dataExame: '2026-11-11', dataValidade: '', cpfExaminador1: '', observacoes: ['99'] };
      expect((await a.post('/api/renach/181', ex06)).body.aceito).toBe(true);
      pv = await a.post('/api/renach/159/prevalidar', p159);
      expect(pv.body.podeAutorizar).toBe(true);
    });

    it('Carla: bloqueio não liberado retorna 018', async () => {
      const a = api(nova());
      const ex = { ...exameMarina(), numero: CARLA, categoriaPretendida: 'AB', categoriaPermitida: 'AB', resultado: '1', observacoes: ['99'] };
      expect((await a.post('/api/renach/181', ex)).body.aceito).toBe(true);
      const r = await a.post('/api/renach/159', { numeroRegistro: CARLA, numeroFormularioRenach: 'SP926030360', motivoRequerimento: '5', categoria: 'AB', tipoAutorizacao: '1' });
      expect(r.body.retorno.codigo).toBe('018');
    });
  });

  describe('Isolamento e reinício', () => {
    it('uma sessão não enxerga alterações de outra', async () => {
      const a = api(nova());
      const b = api(nova());
      await a.post('/api/renach/181', exameMarina()).expect(200);
      await a.post('/api/renach/159', pedido159).expect(200);
      const cb = await c575(b, '2', MARINA);
      expect(cb.body.prontuario.dadosControle.situacaoCnh).toBe('4');
      expect(cb.body.prontuario.exames.find((e: any) => e.codigoExame === '03').dataExame).toBe('2021-03-10');
    });

    it('reiniciar volta ao estado inicial', async () => {
      const a = api(nova());
      await a.post('/api/renach/181', exameMarina()).expect(200);
      await a.post('/api/demo/reiniciar').expect(200);
      const c = await c575(a, '2', MARINA);
      expect(c.body.prontuario.dadosControle.situacaoCnh).toBe('4');
    });

    it('fixtures não são compartilhadas por referência', async () => {
      const { criarFixtures } = await import('../src/domain/fixtures');
      const x = criarFixtures();
      x[0].exames.push({} as any);
      expect(criarFixtures()[0].exames).toHaveLength(4);
    });
  });
});
