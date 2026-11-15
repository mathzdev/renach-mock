import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

process.env.DEMO_HOJE = '2026-11-14';

const MARINA = '90011834250';
const ROGERIO = '90020250096';
const CARLA = '90030360048';
const JULIA = 'SP926050011';
const BANCA = '99000004000137';
const CFC = '99000003000192';
const INSTRUTOR = '90000000418';
const EXAMINADORA = '90000000507';

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
      const r = await api(nova()).post('/api/renach/181', exameMarina({ codigoExame: '06', tipoAtualizacao: 'S', resultado: '1', dataValidade: '', observacoes: ['99'], cpfExaminador1: '', cnpjEntidadeCredenciada: BANCA }));
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
      expect(await cod({ cpfExaminador1: '90000000256' })).toBe('662'); // psicólogo não faz Exame 03
      expect(await cod({ dataExame: '2027-01-01' })).toBe('408');
      expect(await cod({ tipoChave: '1', numero: 'SP926004517' })).toBe('375');
      expect(await cod({ tipoChave: '1', numero: 'SP999999991' })).toBe('006');
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
      const ex06 = { ...base, tipoAtualizacao: 'I', codigoExame: '06', dataExame: '2026-11-11', dataValidade: '', cpfExaminador1: '', cnpjEntidadeCredenciada: BANCA, observacoes: ['99'] };
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


  describe('Primeira habilitação — TR 151 → 181 (C/E, Tipo-Chave 1) → 155 Motivo 1', () => {
    const cadastro = (extra: Record<string, unknown> = {}) => ({
      numeroFormularioRenach: 'SP926060022', nomeCandidatoCivil: 'Bruno Teixeira Aragão', dataNascimento: '2004-08-15', sexo: '1',
      nomeMae: 'Helena Teixeira Aragão', nomePai: '', docTipo: '1', docNumero: '900600220', docOrgao: 'SSP', docUf: 'SP',
      cpf: '000.000.006-04', localidadeNascimento: '06291', enderecoLogradouro: 'Rua Demonstrativa das Palmeiras', enderecoNumero: '60',
      enderecoBairro: 'Jardim Modelo', enderecoCep: '13000-600', enderecoMunicipio: '06291', enderecoUf: 'SP', nacionalidade: '1',
      dataCadastramento: '2026-11-14', ...extra,
    });
    const exameCand = (extra: Record<string, unknown> = {}) => ({
      tipoChave: '1', numero: JULIA, tipoEvento: 'E', tipoAtualizacao: 'I', codigoExame: '02', dataExame: '2026-11-12', resultado: '1',
      dataValidade: '', cpfExaminador1: EXAMINADORA, cnpjEntidadeCredenciada: BANCA, municipioExame: '07107', ufExame: 'SP',
      categoriaPretendida: 'B', categoriaPermitida: 'B', observacoes: ['99'], ...extra,
    });
    const curso34 = (extra: Record<string, unknown> = {}) => ({
      tipoChave: '1', numero: JULIA, tipoEvento: 'C', tipoAtualizacao: 'I', codigoCurso: '34', dataInicioCurso: '2026-11-03',
      dataFimCurso: '2026-11-05', cargaHoraria: '150', cnpjEntidadeCredenciada: CFC, cpfInstrutor: INSTRUTOR, municipioCurso: '07107',
      ufCurso: 'SP', categoria: 'B', observacoesCurso: '99', ...extra,
    });
    const p155 = { numeroFormularioRenach: JULIA, motivoRequerimento: '1', categoria: 'B', tipoAutorizacao: '1' };

    it('575 localiza candidato por formulário (Tipo-Chave 1) e por CPF', async () => {
      const a = api(nova());
      const r = await c575(a, '1', JULIA);
      expect(r.body.consulta.retorno.codigo).toBe('000');
      expect(r.body.prontuario).toMatchObject({ natureza: '1', numeroRegistro: null });
      expect(r.body.prontuario.dadosControle.situacaoCnh).toBe('0');
      expect((await c575(a, '7', '00000000515')).body.prontuario.formularioRenachEmAndamento).toBe(JULIA);
    });

    it('151 cadastra candidato (Situação-CNH 0) e recusa repetição (003) e CPF já cadastrado (761)', async () => {
      const a = api(nova());
      const r = await a.post('/api/renach/151', cadastro()).expect(200);
      expect(r.body.aceito).toBe(true);
      expect(r.body.prontuario).toMatchObject({ natureza: '1', numeroRegistro: null, formularioRenachEmAndamento: 'SP926060022' });
      expect(r.body.prontuario.dadosCadastrais.nomeCondutorCivil).toBe('BRUNO TEIXEIRA ARAGAO');
      expect((await c575(a, '1', 'SP926060022')).body.prontuario.dadosControle.situacaoCnh).toBe('0');
      expect((await a.post('/api/renach/151', cadastro())).body.retorno.codigo).toBe('003');
      expect((await a.post('/api/renach/151', cadastro({ numeroFormularioRenach: 'SP926060030', cpf: '00000000515' }))).body.retorno.codigo).toBe('761');
    });

    it('151 aplica as consistências do Manual', async () => {
      const a = api(nova());
      const cod = async (x: Record<string, unknown>) => (await a.post('/api/renach/151', cadastro(x))).body.retorno.codigo;
      expect(await cod({ numeroFormularioRenach: 'HAB-2026-118342' })).toBe('802');
      expect(await cod({ numeroFormularioRenach: 'RJ926060022' })).toBe('804');
      expect(await cod({ numeroFormularioRenach: 'SP926050011' })).toBe('003');
      expect(await cod({ nomeCandidatoCivil: 'Bruno' })).toBe('805');
      expect(await cod({ dataNascimento: '2010-01-01' })).toBe('311');
      expect(await cod({ sexo: '3' })).toBe('812');
      expect(await cod({ nomeMae: '' })).toBe('300');
      expect(await cod({ docTipo: '9' })).toBe('818');
      expect(await cod({ cpf: '12345678900' })).toBe('830');
      expect(await cod({ enderecoCep: '' })).toBe('305');
      expect(await cod({ enderecoMunicipio: '07107', enderecoUf: 'RJ' })).toBe('308');
      expect(await cod({ dataCadastramento: '2026-12-01' })).toBe('810');
      expect(await cod({ nacionalidade: '3' })).toBe('POC-151-01');
      expect(await cod({ ddd: '11', telefoneCelular: '12345' })).toBe('702');
      expect((await c575(a, '1', 'SP926060022')).body.consulta.retorno.codigo).toBe('006'); // nada foi gravado
    });

    it('181 com Tipo-Chave 1: curso e exame do candidato; regras do Evento C', async () => {
      const a = api(nova());
      const cod = async (x: Record<string, unknown>) => (await a.post('/api/renach/181', curso34(x))).body.retorno.codigo;
      expect(await cod({ cargaHoraria: '120' })).toBe('593');
      expect(await cod({ modalidade: '1' })).toBe('222');
      expect(await cod({ cpfInstrutor: EXAMINADORA, cnpjEntidadeCredenciada: BANCA })).toBe('662');
      expect(await cod({ codigoCurso: '31' })).toBe('395');
      expect(await cod({ codigoCurso: '33', categoria: 'B' })).toBe('382');
      expect(await cod({ codigoCurso: '32', tipoAtualizacao: 'S', categoria: 'C' })).toBe('345');
      expect(await cod({ tipoChave: '1', numero: 'SP926004517' })).toBe('375');
      const ok = await a.post('/api/renach/181', curso34());
      expect(ok.body.aceito).toBe(true);
      expect((await a.post('/api/renach/181', curso34())).body.retorno.codigo).toBe('395');

      const codE = async (x: Record<string, unknown>) => (await a.post('/api/renach/181', exameCand(x))).body.retorno.codigo;
      expect(await codE({ categoriaPretendida: 'C', categoriaPermitida: 'C' })).toBe('345');
      expect(await codE({ cpfExaminador1: '90000000175', cnpjEntidadeCredenciada: '99000000000159' })).toBe('662');
      expect((await a.post('/api/renach/181', exameCand())).body.aceito).toBe(true);
      const c = await c575(a, '1', JULIA);
      expect(c.body.prontuario.cursos.find((x: any) => x.codigoCurso === '34').procedencia).toBe('SIMULACAO_TR181');
      expect(c.body.prontuario.dadosControle.situacaoCnh).toBe('0');
    });

    it('155: pendências 590 e 524 até registrar Curso 34 e Exame 02; habilita (Situação-CNH 1) e repetição retorna 015', async () => {
      const a = api(nova());
      let pv = await a.post('/api/renach/155/prevalidar', p155).expect(200);
      expect(pv.body.podeHabilitar).toBe(false);
      expect(req(pv.body.requisitos, 'H12').codigoRetorno.codigo).toBe('590');
      expect(req(pv.body.requisitos, 'H13-4').codigoRetorno.codigo).toBe('524');
      const rej = await a.post('/api/renach/155', p155);
      expect(rej.body).toMatchObject({ habilitado: false, retorno: { codigo: '590' } });
      expect(rej.body.prontuario.dadosControle.situacaoCnh).toBe('0');

      expect((await a.post('/api/renach/181', curso34())).body.aceito).toBe(true);
      expect((await a.post('/api/renach/181', exameCand())).body.aceito).toBe(true);
      pv = await a.post('/api/renach/155/prevalidar', p155);
      expect(pv.body.podeHabilitar).toBe(true);
      expect(pv.body.resumo.dataValidadePermissao).toBe('2027-11-14');
      expect((await a.post('/api/renach/155', { ...p155, categoria: 'C' })).body.retorno.codigo).toBe('486');
      expect((await a.post('/api/renach/155', { ...p155, categoria: 'AB' })).body.retorno.codigo).toBe('524'); // falta prática 2 rodas

      const r = await a.post('/api/renach/155', p155);
      expect(r.body).toMatchObject({ habilitado: true, retorno: { codigo: '000', origemCodigo: 'MANUAL' } });
      expect(r.body.diagnostico.payload).toMatchObject({ motivoRequerimento: '1', dataPrimeiraHabilitacao: '2026-11-14', dataValidade: '2027-11-14', observacoes: '99' });
      const c = await c575(a, '1', JULIA);
      expect(c.body.prontuario.dadosControle).toMatchObject({ situacaoCnh: '1', motivoRequerimento: '1', categoriaAutorizada: 'B', categoriaAtual: '', permissionario: '1' });
      expect(c.body.prontuario.dadosCadastrais.primeiraHabilitacao).toBe('2026-11-14');
      expect(c.body.prontuario.numeroRegistro).toBeNull();

      const rep = await a.post('/api/renach/155', p155);
      expect(rep.body.retorno.codigo).toBe('015');
      expect(rep.body.prontuario.autorizacoes).toHaveLength(1);
      expect((await a.post('/api/renach/181', exameCand({ tipoAtualizacao: 'S', resultado: '2', categoriaPermitida: '' }))).body.retorno.codigo).toBe('017');
    });

    it('155 recusa condutor (009), motivo diferente de 1 e a 159 recusa o Motivo 1 (369)', async () => {
      const a = api(nova());
      expect((await a.post('/api/renach/155/prevalidar', { ...p155, numeroFormularioRenach: 'SP926004517' }).expect(400)).body.codigo).toBe('009');
      expect((await a.post('/api/renach/155/prevalidar', { ...p155, motivoRequerimento: '5' }).expect(400)).body.codigo).toBe('POC-155-00');
      expect((await a.post('/api/renach/159/prevalidar', { ...pedido159, motivoRequerimento: '1' }).expect(400)).body.codigo).toBe('369');
    });

    it('jornada completa a partir do cadastro (151 → eventos → 155)', async () => {
      const a = api(nova());
      const F = 'SP926060022';
      expect((await a.post('/api/renach/151', cadastro())).body.aceito).toBe(true);
      const ev = async (x: Record<string, unknown>) => (await a.post('/api/renach/181', { tipoChave: '1', numero: F, tipoAtualizacao: 'I', ...x })).body;
      const ex = (c: string, x: Record<string, unknown> = {}) => ev({ tipoEvento: 'E', codigoExame: c, dataExame: '2026-11-14', resultado: '1', dataValidade: '',
        cpfExaminador1: EXAMINADORA, cnpjEntidadeCredenciada: BANCA, municipioExame: '07107', ufExame: 'SP', categoriaPretendida: 'B', categoriaPermitida: 'B', observacoes: ['99'], ...x });
      const cu = (c: string, x: Record<string, unknown> = {}) => ev({ tipoEvento: 'C', codigoCurso: c, dataInicioCurso: '2026-11-14', dataFimCurso: '2026-11-14', cargaHoraria: '45',
        cnpjEntidadeCredenciada: CFC, cpfInstrutor: INSTRUTOR, municipioCurso: '07107', ufCurso: 'SP', categoria: '', observacoesCurso: '99', ...x });
      expect((await cu('34', { cargaHoraria: '150', categoria: 'B' })).retorno.codigo).toBe('592'); // pré-requisitos
      for (const r of [
        await ex('03', { dataValidade: '2036-11-14', cpfExaminador1: '90000000175', cnpjEntidadeCredenciada: '99000000000159' }),
        await ex('04', { cpfExaminador1: '90000000256', cnpjEntidadeCredenciada: '99000000000159' }),
        await cu('31'), await ex('05', { cpfExaminador1: '' }), await cu('34', { cargaHoraria: '150', categoria: 'B' }),
        await cu('32', { cargaHoraria: '20', categoria: 'B' }), await ex('02'),
      ]) expect(r.retorno.codigo).toBe('000');
      const r = await a.post('/api/renach/155', { ...p155, numeroFormularioRenach: F, tipoAutorizacao: '2', ddd: '19', telefoneCelular: '900000602', email: 'bruno@exemplo.invalid' });
      expect(r.body.habilitado).toBe(true);
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
