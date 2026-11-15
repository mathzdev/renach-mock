import { useCallback, useEffect, useState } from 'react';
import { api, ErroApi } from './api';
import { Autorizacao159, Form159, form159Inicial } from './Autorizacao159';
import { Consulta575 } from './Consulta575';
import { mascaraCpf } from './fmt';
import { Form181, form181Inicial, Registro181 } from './Registro181';

type Etapa = 'consulta' | 'exame' | 'autorizacao';

function mensagemErro(e: unknown): string {
  if (e instanceof ErroApi) return `${e.corpo?.codigo ?? e.corpo?.message?.codigo ?? e.status}: ${e.message}`;
  return 'Não foi possível falar com a API local. Verifique se ela está rodando (npm run dev).';
}

export function App() {
  const [catalogos, setCatalogos] = useState<any>(null);
  const [demonstrativos, setDemonstrativos] = useState<any[]>([]);
  const [erroGeral, setErroGeral] = useState('');
  const [etapa, setEtapa] = useState<Etapa>('consulta');
  const [ocupado, setOcupado] = useState(false);

  // Estado compartilhado entre as telas 575, 181 e 159 (a fonte de verdade é a sessão na API)
  const [consulta, setConsulta] = useState<any>(null);
  const [prontuario, setProntuario] = useState<any>(null);
  const [form181, setForm181] = useState<Form181>(form181Inicial(null));
  const [resultado181, setResultado181] = useState<any>(null);
  const [form159, setForm159] = useState<Form159>(form159Inicial(null));
  const [prevalidacao, setPrevalidacao] = useState<any>(null);
  const [resultado159, setResultado159] = useState<any>(null);
  const [erro159, setErro159] = useState('');

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
  };

  async function consultar(tipo: string, numero: string) {
    setOcupado(true);
    try {
      const r = await api.consultar575(tipo, numero);
      setConsulta(r);
      if (r.prontuario) {
        if (r.prontuario.numeroRegistro !== prontuario?.numeroRegistro) iniciarProntuario(r.prontuario);
        setProntuario(r.prontuario);
      }
      setErroGeral('');
    } catch (e) {
      setErroGeral(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  /** Recarrega a 575 do prontuário atual para refletir mutações da 181/159. */
  async function atualizarProntuario() {
    if (!prontuario) return;
    const r = await api.consultar575('2', prontuario.numeroRegistro);
    setConsulta(r);
    setProntuario(r.prontuario);
  }

  const prevalidar = useCallback(async () => {
    if (!prontuario) return;
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

  useEffect(() => {
    if (etapa === 'autorizacao' && prontuario) prevalidar();
    // revalida ao entrar na etapa ou ao trocar o prontuário
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, prontuario?.numeroRegistro]);

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

  async function reiniciar() {
    await api.reiniciar();
    setConsulta(null);
    setProntuario(null);
    setForm181(form181Inicial(null));
    setResultado181(null);
    setPrevalidacao(null);
    setResultado159(null);
    setEtapa('consulta');
    window.scrollTo(0, 0);
  }

  const ir = (e: Etapa) => { setEtapa(e); window.scrollTo(0, 0); };

  const feito: Record<Etapa, boolean> = {
    consulta: !!prontuario,
    exame: !!prontuario?.exames.some((e: any) => e.procedencia === 'SIMULACAO_TR181' && e.codigoExame === '03'),
    autorizacao: prontuario?.dadosControle.situacaoCnh === '1',
  };
  const ETAPAS: { id: Etapa; rotulo: string; tr: string }[] = [
    { id: 'consulta', rotulo: 'Consulta', tr: 'TR 575' },
    { id: 'exame', rotulo: 'Exame', tr: 'TR 181-E' },
    { id: 'autorizacao', rotulo: 'Autorização', tr: 'TR 159 · Motivo 5' },
  ];

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="cabecalho-linha">
          <div className="marca">
            <strong>RENACH</strong>
            <span className="muted">Jornada de renovação</span>
          </div>
          <span className="selo-demo" role="note">Ambiente Demonstrativo — Dados Fictícios</span>
        </div>
        <div className="condutor" aria-live="polite">
          {prontuario ? (
            <>
              <strong>{prontuario.dadosCadastrais.nomeCondutorCivil}</strong>
              <span>Registro {prontuario.numeroRegistro}</span>
              <span>CPF {mascaraCpf(prontuario.dadosCadastrais.cpf)}</span>
              <span>Cat. {prontuario.dadosControle.categoriaAtual}</span>
              <span>Situação-CNH {prontuario.dadosControle.situacaoCnh} – {catalogos?.situacoesCnh[prontuario.dadosControle.situacaoCnh]}</span>
              {prontuario.processoEstadualReferencia && <span className="muted">Proc. estadual {prontuario.processoEstadualReferencia} (referência)</span>}
            </>
          ) : <span className="muted">Nenhum prontuário consultado</span>}
        </div>
        <nav className="progresso" aria-label="Progresso da jornada">
          {ETAPAS.map((e, i) => (
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
        ) : (
          <Autorizacao159 catalogos={catalogos} prontuario={prontuario} form={form159} setForm={setForm159} prevalidacao={prevalidacao} resultado={resultado159}
            carregando={ocupado} erro={erro159} onRevalidar={prevalidar} onAutorizar={autorizar} onIr={ir} />
        )}
      </main>

      <footer className="rodape">
        <p>Protótipo local. Sem comunicação com BCA, SENATRAN ou SERPRO. Nada aqui tem validade jurídica.</p>
        <button className="btn btn-pequeno" onClick={reiniciar}>Reiniciar demonstração</button>
      </footer>
    </div>
  );
}
