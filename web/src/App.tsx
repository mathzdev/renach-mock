import { useCallback, useEffect, useState } from 'react';
import { api, ErroApi } from './api';
import { Autorizacao159, Form159, form159Inicial } from './Autorizacao159';
import { Cadastro151, Form151, form151Inicial } from './Cadastro151';
import { Consulta575 } from './Consulta575';
import { Eventos181, eventosExigidos, FormCurso, formCursoInicial } from './Eventos181';
import { mascaraCpf } from './fmt';
import { Form155, form155Inicial, Habilitacao155 } from './Habilitacao155';
import { Form181, form181Inicial, Registro181 } from './Registro181';

type Jornada = 'renovacao' | 'habilitacao';
type Etapa = 'consulta' | 'exame' | 'autorizacao' | 'cadastro' | 'eventos' | 'habilitacao';

const ETAPAS: Record<Jornada, { id: Etapa; rotulo: string; tr: string }[]> = {
  renovacao: [
    { id: 'consulta', rotulo: 'Consulta', tr: 'TR 575' },
    { id: 'exame', rotulo: 'Exame', tr: 'TR 181-E' },
    { id: 'autorizacao', rotulo: 'Autorização', tr: 'TR 159 · Motivo 5' },
  ],
  habilitacao: [
    { id: 'cadastro', rotulo: 'Cadastro', tr: 'TR 151' },
    { id: 'eventos', rotulo: 'Eventos', tr: 'TR 181 · C e E' },
    { id: 'habilitacao', rotulo: 'Habilitação', tr: 'TR 155 · Motivo 1' },
    { id: 'consulta', rotulo: 'Consulta', tr: 'TR 575' },
  ],
};

/** Chave RENACH do prontuário: candidato pelo formulário (Tipo-Chave 1), condutor pelo registro (Tipo-Chave 2). */
const chaveDe = (p: any): [string, string] | null => (!p ? null : p.natureza === '1' ? ['1', p.formularioRenachEmAndamento] : ['2', p.numeroRegistro]);

function mensagemErro(e: unknown): string {
  if (e instanceof ErroApi) return `${e.corpo?.codigo ?? e.corpo?.message?.codigo ?? e.status}: ${e.message}`;
  return 'Não foi possível falar com a API local. Verifique se ela está rodando (npm run dev).';
}

export function App() {
  const [catalogos, setCatalogos] = useState<any>(null);
  const [demonstrativos, setDemonstrativos] = useState<any[]>([]);
  const [erroGeral, setErroGeral] = useState('');
  const [jornada, setJornada] = useState<Jornada>('renovacao');
  const [etapa, setEtapa] = useState<Etapa>('consulta');
  const [ocupado, setOcupado] = useState(false);

  // Estado compartilhado entre as telas (a fonte de verdade é a sessão na API)
  const [consulta, setConsulta] = useState<any>(null);
  const [prontuario, setProntuario] = useState<any>(null);
  const [form181, setForm181] = useState<Form181>(form181Inicial(null));
  const [resultado181, setResultado181] = useState<any>(null);
  const [form159, setForm159] = useState<Form159>(form159Inicial(null));
  const [prevalidacao, setPrevalidacao] = useState<any>(null);
  const [resultado159, setResultado159] = useState<any>(null);
  const [erro159, setErro159] = useState('');
  // Primeira habilitação
  const [form151, setForm151] = useState<Form151>(form151Inicial());
  const [resultado151, setResultado151] = useState<any>(null);
  const [abaEvento, setAbaEvento] = useState<'E' | 'C'>('E');
  const [formCurso, setFormCurso] = useState<FormCurso>(formCursoInicial(null));
  const [resultadoCurso, setResultadoCurso] = useState<any>(null);
  const [form155, setForm155] = useState<Form155>(form155Inicial(null));
  const [prevalidacao155, setPrevalidacao155] = useState<any>(null);
  const [resultado155, setResultado155] = useState<any>(null);
  const [erro155, setErro155] = useState('');

  const carregarDemonstrativos = () => api.demonstrativos().then(setDemonstrativos).catch(() => undefined);
  useEffect(() => {
    Promise.all([api.catalogos(), api.demonstrativos()])
      .then(([c, d]) => { setCatalogos(c); setDemonstrativos(d); })
      .catch((e) => setErroGeral(mensagemErro(e)));
  }, []);

  const iniciarProntuario = (p: any) => {
    setForm181(form181Inicial(p));
    setResultado181(null);
    setForm159(form159Inicial(p));
    setPrevalidacao(null);
    setResultado159(null);
    setErro159('');
    setFormCurso(formCursoInicial(p));
    setResultadoCurso(null);
    setForm155(form155Inicial(p));
    setPrevalidacao155(null);
    setResultado155(null);
    setErro155('');
  };

  function trocarProntuario(p: any) {
    const atual = chaveDe(prontuario)?.join(':');
    if (chaveDe(p)?.join(':') !== atual) iniciarProntuario(p);
    setProntuario(p);
    // a jornada acompanha a natureza do prontuário consultado
    if (p.natureza === '1' && jornada !== 'habilitacao') setJornada('habilitacao');
    if (p.natureza === '2' && jornada !== 'renovacao') setJornada('renovacao');
  }

  async function consultar(tipo: string, numero: string) {
    setOcupado(true);
    try {
      const r = await api.consultar575(tipo, numero);
      setConsulta(r);
      if (r.prontuario) trocarProntuario(r.prontuario);
      setErroGeral('');
      return r;
    } catch (e) {
      setErroGeral(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  /** Recarrega a 575 do prontuário atual para refletir mutações da 181/159/155. */
  async function atualizarProntuario(p = prontuario) {
    const chave = chaveDe(p);
    if (!chave) return;
    const r = await api.consultar575(chave[0], chave[1]);
    setConsulta(r);
    setProntuario(r.prontuario);
  }

  const prevalidar = useCallback(async () => {
    if (!prontuario || prontuario.natureza !== '2') return;
    setOcupado(true);
    setErro159('');
    try {
      setPrevalidacao(await api.prevalidar159({ numeroRegistro: prontuario.numeroRegistro, motivoRequerimento: '5', ...form159 }));
    } catch (e) {
      setErro159(mensagemErro(e));
      setPrevalidacao(null);
    } finally {
      setOcupado(false);
    }
  }, [prontuario, form159]);

  const pedido155 = () => ({ numeroFormularioRenach: prontuario.formularioRenachEmAndamento, motivoRequerimento: '1', ...form155 });
  const prevalidar155 = useCallback(async () => {
    if (!prontuario || prontuario.natureza !== '1') return;
    setOcupado(true);
    setErro155('');
    try {
      setPrevalidacao155(await api.prevalidar155(pedido155()));
    } catch (e) {
      setErro155(mensagemErro(e));
      setPrevalidacao155(null);
    } finally {
      setOcupado(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prontuario, form155]);

  useEffect(() => {
    if (etapa === 'autorizacao' && prontuario) prevalidar();
    if (etapa === 'habilitacao' && prontuario) prevalidar155();
    // revalida ao entrar na etapa ou ao trocar o prontuário
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, prontuario && chaveDe(prontuario)?.join(':')]);

  async function enviar181() {
    setOcupado(true);
    try {
      const r = await api.registrar181(form181);
      setResultado181(r);
      if (r.aceito) await atualizarProntuario();
    } catch (e) {
      setErroGeral(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function enviarCurso() {
    setOcupado(true);
    try {
      const r = await api.registrar181(formCurso);
      setResultadoCurso(r);
      if (r.aceito) await atualizarProntuario();
    } catch (e) {
      setErroGeral(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function autorizar() {
    setOcupado(true);
    try {
      const r = await api.autorizar159({ numeroRegistro: prontuario.numeroRegistro, motivoRequerimento: '5', ...form159 });
      setResultado159(r);
      setProntuario(r.prontuario);
      await atualizarProntuario();
      setPrevalidacao(await api.prevalidar159({ numeroRegistro: prontuario.numeroRegistro, motivoRequerimento: '5', ...form159 }));
    } catch (e) {
      setErro159(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function cadastrar() {
    setOcupado(true);
    try {
      const r = await api.cadastrar151(form151);
      setResultado151(r);
      if (r.aceito) {
        trocarProntuario(r.prontuario);
        await atualizarProntuario(r.prontuario);
        await carregarDemonstrativos();
      }
    } catch (e) {
      setErroGeral(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function habilitar() {
    setOcupado(true);
    try {
      const r = await api.habilitar155(pedido155());
      setResultado155(r);
      setProntuario(r.prontuario);
      await atualizarProntuario();
      setPrevalidacao155(await api.prevalidar155(pedido155()));
    } catch (e) {
      setErro155(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function reiniciar() {
    await api.reiniciar();
    setConsulta(null);
    setProntuario(null);
    iniciarProntuario(null);
    setForm151(form151Inicial());
    setResultado151(null);
    await carregarDemonstrativos();
    setEtapa(jornada === 'renovacao' ? 'consulta' : 'cadastro');
    window.scrollTo(0, 0);
  }

  const ir = (e: string) => { setEtapa(e as Etapa); window.scrollTo(0, 0); };
  function escolherJornada(j: Jornada) {
    if (j === jornada) return;
    setJornada(j);
    // o prontuário aberto só continua se for da natureza da jornada escolhida
    if (prontuario && (prontuario.natureza === '1') !== (j === 'habilitacao')) {
      setProntuario(null);
      setConsulta(null);
      iniciarProntuario(null);
    }
    ir(j === 'renovacao' ? 'consulta' : 'cadastro');
  }

  const candidato = prontuario?.natureza === '1';
  const feito: Record<Etapa, boolean> = {
    consulta: jornada === 'renovacao' ? !!prontuario : !!consulta?.prontuario && candidato,
    exame: !!prontuario?.exames.some((e: any) => e.procedencia === 'SIMULACAO_TR181' && e.codigoExame === '03'),
    autorizacao: !candidato && prontuario?.dadosControle.situacaoCnh === '1',
    cadastro: candidato,
    eventos: candidato && eventosExigidos(prontuario, form155.categoria).every((i) => i.ok),
    habilitacao: candidato && prontuario?.dadosControle.situacaoCnh === '1',
  };
  const etapas = ETAPAS[jornada];

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="cabecalho-linha">
          <div className="marca">
            <strong>RENACH</strong>
            <span className="muted">{jornada === 'renovacao' ? 'Jornada de renovação' : 'Jornada de primeira habilitação'}</span>
          </div>
          <span className="selo-demo" role="note">Ambiente Demonstrativo — Dados Fictícios</span>
        </div>
        <div className="jornadas" role="group" aria-label="Jornada">
          <button type="button" className="jornada" aria-pressed={jornada === 'renovacao'} onClick={() => escolherJornada('renovacao')}>Renovação · Motivo 5</button>
          <button type="button" className="jornada" aria-pressed={jornada === 'habilitacao'} onClick={() => escolherJornada('habilitacao')}>Primeira habilitação · Motivo 1</button>
        </div>
        <div className="condutor" aria-live="polite">
          {prontuario ? (
            <>
              <strong>{prontuario.dadosCadastrais.nomeCondutorCivil}</strong>
              {candidato ? <span>Candidato · Formulário {prontuario.formularioRenachEmAndamento}</span> : <span>Registro {prontuario.numeroRegistro}</span>}
              <span>CPF {mascaraCpf(prontuario.dadosCadastrais.cpf)}</span>
              {candidato
                ? <span>Cat. {prontuario.dadosControle.categoriaAutorizada ?? form155.categoria} (pretendida)</span>
                : <span>Cat. {prontuario.dadosControle.categoriaAtual}</span>}
              <span>Situação-CNH {prontuario.dadosControle.situacaoCnh} – {catalogos?.situacoesCnh[prontuario.dadosControle.situacaoCnh]}</span>
              {prontuario.processoEstadualReferencia && <span className="muted">Proc. estadual {prontuario.processoEstadualReferencia} (referência)</span>}
            </>
          ) : <span className="muted">{jornada === 'renovacao' ? 'Nenhum prontuário consultado' : 'Nenhum candidato selecionado'}</span>}
        </div>
        <nav className={`progresso ${etapas.length === 4 ? 'progresso-4' : ''}`} aria-label="Progresso da jornada">
          {etapas.map((e, i) => (
            <button key={e.id} className={`passo ${etapa === e.id ? 'ativo' : ''} ${feito[e.id] ? 'feito' : ''}`}
              aria-current={etapa === e.id ? 'step' : undefined} onClick={() => ir(e.id)}>
              <span className="passo-num">{feito[e.id] ? '✓' : i + 1}</span>
              <span className="passo-texto"><span>{e.rotulo}</span><small>{e.tr}</small></span>
            </button>
          ))}
        </nav>
      </header>

      <main className="conteudo">
        {erroGeral && <p className="painel resultado-erro" role="alert">{erroGeral}</p>}
        {!catalogos ? (
          !erroGeral && <p className="muted">Carregando…</p>
        ) : etapa === 'consulta' ? (
          <Consulta575 catalogos={catalogos} demonstrativos={demonstrativos} resultado={consulta} carregando={ocupado} onConsultar={consultar} onIr={ir} />
        ) : etapa === 'exame' ? (
          <Registro181 catalogos={catalogos} prontuario={prontuario} form={form181} setForm={setForm181} resultado={resultado181}
            enviando={ocupado} onEnviar={enviar181} onLimpar={() => { setForm181(form181Inicial(prontuario)); setResultado181(null); }} onIr={ir} />
        ) : etapa === 'autorizacao' ? (
          <Autorizacao159 catalogos={catalogos} prontuario={prontuario} form={form159} setForm={setForm159} prevalidacao={prevalidacao} resultado={resultado159}
            carregando={ocupado} erro={erro159} onRevalidar={prevalidar} onAutorizar={autorizar} onIr={ir} />
        ) : etapa === 'cadastro' ? (
          <Cadastro151 catalogos={catalogos} candidatos={demonstrativos.filter((d) => d.natureza === '1')} form={form151} setForm={setForm151}
            resultado={resultado151} enviando={ocupado} onEnviar={cadastrar} onIr={ir}
            onContinuar={async (f) => { const r = await consultar('1', f); if (r?.prontuario) ir('eventos'); }} />
        ) : etapa === 'eventos' ? (
          <Eventos181 catalogos={catalogos} prontuario={prontuario} aba={abaEvento} setAba={setAbaEvento}
            form181={form181} setForm181={setForm181} resultado181={resultado181} formCurso={formCurso} setFormCurso={setFormCurso} resultadoCurso={resultadoCurso}
            enviando={ocupado} onEnviarExame={enviar181} onEnviarCurso={enviarCurso} onIr={ir}
            onLimparExame={() => { setForm181(form181Inicial(prontuario)); setResultado181(null); }}
            onLimparCurso={() => { setFormCurso(formCursoInicial(prontuario)); setResultadoCurso(null); }} />
        ) : (
          <Habilitacao155 catalogos={catalogos} prontuario={prontuario} form={form155} setForm={setForm155} prevalidacao={prevalidacao155} resultado={resultado155}
            carregando={ocupado} erro={erro155} onRevalidar={prevalidar155} onHabilitar={habilitar} onIr={ir} />
        )}
      </main>

      <footer className="rodape">
        <p>Protótipo local. Sem comunicação com BCA, SENATRAN ou SERPRO. Nada aqui tem validade jurídica.</p>
        <button className="btn btn-pequeno" onClick={reiniciar}>Reiniciar demonstração</button>
      </footer>
    </div>
  );
}
