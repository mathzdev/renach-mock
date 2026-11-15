import { useState } from 'react';
import { Card, Confirmacao, Diagnostico, FonteSelo, Retorno, Selo, StatusSelo } from './componentes';
import { br } from './fmt';

export interface Form155 {
  categoria: string;
  tipoAutorizacao: string;
  ddd: string;
  telefoneCelular: string;
  email: string;
}

export function form155Inicial(p: any): Form155 {
  const cat = p?.exames?.find((e: any) => e.codigoExame === '03')?.categoriaPretendida;
  return {
    categoria: cat && ['A', 'B', 'AB', 'X', 'XB'].includes(cat) ? cat : 'B',
    tipoAutorizacao: '1',
    ddd: p?.dadosCadastrais?.ddd ?? '',
    telefoneCelular: p?.dadosCadastrais?.telefoneCelular ?? '',
    email: p?.dadosCadastrais?.email ?? '',
  };
}

interface Props {
  catalogos: any;
  prontuario: any;
  form: Form155;
  setForm: (f: Form155) => void;
  prevalidacao: any;
  resultado: any;
  carregando: boolean;
  erro: string;
  onRevalidar: () => void;
  onHabilitar: () => void;
  onIr: (etapa: string) => void;
}

export function Habilitacao155({ catalogos, prontuario, form, setForm, prevalidacao, resultado, carregando, erro, onRevalidar, onHabilitar, onIr }: Props) {
  const [confirmar, setConfirmar] = useState(false);

  if (!prontuario || prontuario.natureza !== '1') {
    return (
      <section className="painel">
        <h2>Habilitação do candidato — TR 155</h2>
        <p>Cadastre um candidato na TR 151 ou continue um processo da massa fictícia antes de habilitar.</p>
        <button className="btn btn-primario" onClick={() => onIr('cadastro')}>Ir para o Cadastro (TR 151)</button>
      </section>
    );
  }

  const r = prevalidacao?.resumo;
  const requisitos: any[] = prevalidacao?.requisitos ?? [];
  const pode = !!prevalidacao?.podeHabilitar;
  const campoErro = new Set(requisitos.filter((q) => q.status === 'NAO_ATENDIDO').flatMap((q) => q.campos ?? []));
  const cls = (k: string) => (campoErro.has(k) ? 'com-erro' : '');
  const faltaEvento = requisitos.some((q) => /^H(0[789]|1[0-3])/.test(q.id) && q.status === 'NAO_ATENDIDO');
  const evento = (x: any, rotulo: string) => x ? `${rotulo}: ${br(x.dataExame ?? x.dataFimCurso)}${x.descricaoResultado ? ` · ${x.descricaoResultado}` : ''}` : `${rotulo}: —`;

  return (
    <section aria-labelledby="t155">
      <header className="pagina-topo">
        <div>
          <p className="trilha">RENACH › Candidato › TR 155 – Habilitar Candidato</p>
          <h2 id="t155">Habilitação do candidato — revisão</h2>
        </div>
      </header>

      <div className="painel grade-campos">
        <label>
          <span className="rotulo">Motivo-Requerimento <small className="pos">pos. 049–052</small></span>
          <select value="1" disabled><option value="1">1 — Primeira Habilitação</option></select>
          <span className="ajuda">Motivo 1 não pode vir acompanhado de outro (348).</span>
        </label>
        <label>
          <span className="rotulo">Número-Formulário-RENACH <small className="pos">pos. 038–048</small></span>
          <input value={prontuario.formularioRenachEmAndamento} readOnly />
          <span className="ajuda">O mesmo formulário da TR 151 (deve existir na BINCO, 006).</span>
        </label>
        <label className={cls('categoria')}>
          <span className="rotulo">Categoria <span className="obrig">*</span><small className="pos">pos. 137–140</small></span>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {catalogos.categorias.map((c: string) => <option key={c}>{c}</option>)}
          </select>
          <span className="ajuda">Motivo 1: A, B, AB, X ou XB (486). Coberta pelos exames e cursos (345).</span>
        </label>
        <label className={cls('tipoAutorizacao')}>
          <span className="rotulo">Tipo de Autorização <span className="obrig">*</span><small className="pos">pos. 273</small></span>
          <select value={form.tipoAutorizacao} onChange={(e) => setForm({ ...form, tipoAutorizacao: e.target.value })}>
            <option value="1">1 – Impressa</option>
            <option value="2">2 – Impressa e Digital</option>
          </select>
          <span className="ajuda">Com 2, DDD, celular e e-mail são obrigatórios.</span>
        </label>
        {form.tipoAutorizacao === '2' && (
          <>
            <label className={cls('ddd')}>
              <span className="rotulo">DDD <span className="obrig">*</span><small className="pos">pos. 274–275</small></span>
              <input value={form.ddd} inputMode="numeric" maxLength={2} onChange={(e) => setForm({ ...form, ddd: e.target.value.replace(/\D/g, '') })} />
            </label>
            <label className={cls('telefoneCelular')}>
              <span className="rotulo">Telefone celular <span className="obrig">*</span><small className="pos">pos. 276–284</small></span>
              <input value={form.telefoneCelular} inputMode="numeric" maxLength={9} placeholder="9 dígitos (fictício)" onChange={(e) => setForm({ ...form, telefoneCelular: e.target.value.replace(/\D/g, '') })} />
            </label>
            <label className={cls('email')}>
              <span className="rotulo">E-mail <span className="obrig">*</span><small className="pos">pos. 285–344</small></span>
              <input type="email" value={form.email} maxLength={60} placeholder="exemplo@exemplo.invalid" onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </>
        )}
      </div>

      {erro && <p className="painel resultado-erro" role="alert">{erro}</p>}

      {r && (
        <>
          <div className="cards">
            <Card titulo="Situação-CNH atual" tom={r.situacaoCnh.codigo === '1' ? 'ok' : 'neutro'} valor={`${r.situacaoCnh.codigo} – ${r.situacaoCnh.descricao}`}
              detalhe={`Cadastrado em ${br(r.dataCadastramento)}`} />
            <Card titulo="Prazo do processo" tom={r.prazoProcesso >= r.dataPrimeiraHabilitacao ? 'ok' : 'erro'} valor={`até ${br(r.prazoProcesso)}`}
              detalhe="Data-Cadastramento + 1 ano e 60 dias (763)" />
            <Card titulo="Pendências" tom={prevalidacao.pendencias.length ? 'erro' : 'ok'} valor={prevalidacao.pendencias.length || 'Nenhuma'}
              detalhe={prevalidacao.pendencias.join(' · ') || 'Requisitos impeditivos atendidos'} />
            <Card titulo="Pré-validação" tom={pode ? 'ok' : 'erro'} valor={pode ? 'Liberada' : 'Bloqueada'} detalhe={pode ? 'Simulação pode ser executada' : 'Corrija as pendências'} />
          </div>

          <div className="painel">
            <h3>Resumo para revisão</h3>
            <dl className="campos">
              <div><dt>Candidato</dt><dd>{r.candidato}{r.nomeSocial ? ` (nome social: ${r.nomeSocial})` : ''}</dd></div>
              <div><dt>Número-Formulário-RENACH</dt><dd>{r.numeroFormularioRenach}</dd></div>
              <div><dt>Motivo-Requerimento</dt><dd>1 — Primeira Habilitação</dd></div>
              <div><dt>Categoria</dt><dd>{r.categoria}</dd></div>
              <div><dt>Data-Primeira-Habilitação</dt><dd>{br(r.dataPrimeiraHabilitacao)} <small className="muted">(data da 155, 529)</small></dd></div>
              <div><dt>Validade da Permissão para Dirigir</dt><dd>{br(r.dataValidadePermissao)} <small className="muted">(1 ano, obs. 1)</small></dd></div>
              <div><dt>Observações (quadro CNH)</dt><dd><code>{r.observacoes}</code></dd></div>
              <div><dt>Número-Registro</dt><dd>— <small className="muted">(gerado na emissão, TR 171)</small></dd></div>
            </dl>
            <h4>Eventos no prontuário</h4>
            <ul className="lista-eventos">
              {['03', '04', '05', '01', '02'].map((c) => <li key={c}><span>{evento(r.eventos.exames[c], `Exame ${c}`)}</span></li>)}
              {['31', '32', '33', '34'].map((c) => <li key={c}><span>{evento(r.eventos.cursos[c], `Curso ${c}`)}</span></li>)}
            </ul>
          </div>

          <div className="painel">
            <h3>Requisitos ({requisitos.length})</h3>
            <p className="muted">Abra cada requisito para ver a explicação, a origem no Manual e o código de retorno.</p>
            <ul className="requisitos">
              {requisitos.map((q) => (
                <li key={q.id}>
                  <details>
                    <summary>
                      <StatusSelo status={q.status} />
                      <span className="req-titulo">{q.titulo}</span>
                      {q.impeditivo && q.status === 'NAO_ATENDIDO' && <Selo tipo="erro">Impeditivo{q.codigoRetorno ? ` · ${q.codigoRetorno.codigo}` : ''}</Selo>}
                    </summary>
                    <div className="req-corpo">
                      <p>{q.detalhe}</p>
                      <p><FonteSelo fonte={q.fonte} /> {q.impeditivo ? 'Requisito impeditivo' : 'Informativo — não bloqueia'}{q.referencia && <small className="ref"> · {q.referencia}</small>}</p>
                      {q.codigoRetorno && <p><Retorno retorno={q.codigoRetorno} /></p>}
                      {q.status === 'NAO_VERIFICAVEL' && <p className="muted">Ausência de informação na massa não é tratada como resultado negativo oficial.</p>}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="acoes-pagina barra-fixa">
        <button className="btn" onClick={onRevalidar} disabled={carregando}>Revalidar requisitos</button>
        {!pode && faltaEvento && <button className="btn" onClick={() => onIr('eventos')}>Registrar eventos (TR 181)</button>}
        <button className="btn btn-primario" disabled={!pode || carregando} onClick={() => setConfirmar(true)}
          title={pode ? '' : 'Indisponível: há validações impeditivas pendentes'}>
          Simular habilitação
        </button>
      </div>

      {resultado && (
        <div className={`painel resultado ${resultado.habilitado ? 'resultado-ok' : 'resultado-erro'}`} role="status">
          <h3>{resultado.habilitado ? 'Aceito na simulação' : 'Rejeitado na simulação'}</h3>
          <p><Retorno retorno={resultado.retorno} /></p>
          {resultado.habilitado
            ? <p>Situação-CNH demonstrativa: <strong>1 — Emissão Autorizada</strong>. Permissão para Dirigir válida até {br(resultado.prontuario.dadosControle.dataValidadeCnh)}. Nenhuma CNH foi emitida.</p>
            : <p>Nenhuma alteração foi feita no prontuário.</p>}
          <button className="btn" onClick={() => onIr('consulta')}>Ver resultado na Consulta 575</button>
          <Diagnostico diag={resultado.diagnostico} />
        </div>
      )}

      <Confirmacao aberto={confirmar} titulo="Simular habilitação do candidato?" rotuloConfirmar="Simular habilitação"
        onCancelar={() => setConfirmar(false)} onConfirmar={() => { setConfirmar(false); onHabilitar(); }}>
        <ul className="resumo-confirmacao">
          <li>Candidato: <strong>{prontuario.dadosCadastrais.nomeCondutorCivil}</strong></li>
          <li>Motivo 1 — Primeira Habilitação · categoria {form.categoria}</li>
          <li>Formulário RENACH: {prontuario.formularioRenachEmAndamento} · validade {br(r?.dataValidadePermissao)}</li>
        </ul>
      </Confirmacao>
    </section>
  );
}
