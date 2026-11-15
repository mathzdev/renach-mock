import { useState } from 'react';
import { Card, Confirmacao, Diagnostico, FonteSelo, Retorno, Selo, StatusSelo } from './componentes';
import { br } from './fmt';

export interface Form159 {
  numeroFormularioRenach: string;
  categoria: string;
  tipoAutorizacao: string;
  ddd: string;
  telefoneCelular: string;
  email: string;
}

export function form159Inicial(p: any): Form159 {
  return {
    numeroFormularioRenach: p?.formularioRenachEmAndamento ?? '',
    categoria: p?.dadosControle?.categoriaAtual ?? '',
    tipoAutorizacao: '1',
    ddd: p?.dadosCadastrais?.ddd ?? '',
    telefoneCelular: p?.dadosCadastrais?.telefoneCelular ?? '',
    email: p?.dadosCadastrais?.email ?? '',
  };
}

interface Props {
  catalogos: any;
  prontuario: any;
  form: Form159;
  setForm: (f: Form159) => void;
  prevalidacao: any;
  resultado: any;
  carregando: boolean;
  erro: string;
  onRevalidar: () => void;
  onAutorizar: () => void;
  onIr: (etapa: 'consulta' | 'exame') => void;
}

export function Autorizacao159({ catalogos, prontuario, form, setForm, prevalidacao, resultado, carregando, erro, onRevalidar, onAutorizar, onIr }: Props) {
  const [confirmar, setConfirmar] = useState(false);

  if (!prontuario) {
    return (
      <section className="painel">
        <h2>Autorização de emissão — TR 159</h2>
        <p>Consulte um prontuário na TR 575 antes de autorizar a emissão.</p>
        <button className="btn btn-primario" onClick={() => onIr('consulta')}>Ir para a Consulta 575</button>
      </section>
    );
  }

  const r = prevalidacao?.resumo;
  const requisitos: any[] = prevalidacao?.requisitos ?? [];
  const pode = !!prevalidacao?.podeAutorizar;
  const campoErro = new Set(requisitos.filter((q) => q.status === 'NAO_ATENDIDO').flatMap((q) => q.campos ?? []));
  const cls = (k: string) => (campoErro.has(k) ? 'com-erro' : '');
  const precisaExame = requisitos.some((q) => ['R08', 'R11', 'R10'].includes(q.id) && q.status === 'NAO_ATENDIDO');

  return (
    <section aria-labelledby="t159">
      <header className="pagina-topo">
        <div>
          <p className="trilha">RENACH › CNH › TR 159 – Autorizar Emissão CNH</p>
          <h2 id="t159">Autorização de emissão — revisão</h2>
        </div>
      </header>

      <div className="painel grade-campos">
        <label>
          <span className="rotulo">Motivo-Requerimento <small className="pos">pos. 060–063</small></span>
          <select value="5" disabled aria-describedby="ajuda-motivo"><option value="5">5 — Renovação de Exames</option></select>
          <span id="ajuda-motivo" className="ajuda">Único motivo executado nesta etapa da POC.</span>
        </label>
        <label className={cls('numeroFormularioRenach')}>
          <span className="rotulo">Número-Formulário-RENACH <span className="obrig">*</span><small className="pos">pos. 049–059</small></span>
          <input value={form.numeroFormularioRenach} maxLength={15} onChange={(e) => setForm({ ...form, numeroFormularioRenach: e.target.value.toUpperCase() })} />
          <span className="ajuda">UF de origem ({catalogos.ufOrigem}) + 9 dígitos, ainda não usado em emissão (003). Não use HAB-...</span>
        </label>
        <label className={cls('categoria')}>
          <span className="rotulo">Categoria <span className="obrig">*</span><small className="pos">pos. 148–151</small></span>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {catalogos.categorias.map((c: string) => <option key={c}>{c}</option>)}
          </select>
          <span className="ajuda">No Motivo 5 isolado, igual à Categoria-Atual (982).</span>
        </label>
        <label className={cls('tipoAutorizacao')}>
          <span className="rotulo">Tipo de Autorização <span className="obrig">*</span><small className="pos">pos. 284</small></span>
          <select value={form.tipoAutorizacao} onChange={(e) => setForm({ ...form, tipoAutorizacao: e.target.value })}>
            <option value="1">1 – Impressa</option>
            <option value="2">2 – Impressa e Digital</option>
          </select>
          <span className="ajuda">Com 2, DDD, celular e e-mail são obrigatórios.</span>
        </label>
        {form.tipoAutorizacao === '2' && (
          <>
            <label className={cls('ddd')}>
              <span className="rotulo">DDD <span className="obrig">*</span><small className="pos">pos. 285–286</small></span>
              <input value={form.ddd} inputMode="numeric" maxLength={2} onChange={(e) => setForm({ ...form, ddd: e.target.value.replace(/\D/g, '') })} />
            </label>
            <label className={cls('telefoneCelular')}>
              <span className="rotulo">Telefone celular <span className="obrig">*</span><small className="pos">pos. 287–295</small></span>
              <input value={form.telefoneCelular} inputMode="numeric" maxLength={9} placeholder="9 dígitos (fictício)" onChange={(e) => setForm({ ...form, telefoneCelular: e.target.value.replace(/\D/g, '') })} />
            </label>
            <label className={cls('email')}>
              <span className="rotulo">E-mail <span className="obrig">*</span><small className="pos">pos. 296–355</small></span>
              <input type="email" value={form.email} maxLength={60} placeholder="exemplo@exemplo.invalid" onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </>
        )}
      </div>

      {erro && <p className="painel resultado-erro" role="alert">{erro}</p>}

      {r && (
        <>
          <div className="cards">
            <Card titulo="Situação-CNH atual" tom={r.situacaoCnh.codigo === '1' ? 'ok' : r.situacaoCnh.codigo === '6' ? 'aviso' : 'neutro'}
              valor={`${r.situacaoCnh.codigo} – ${r.situacaoCnh.descricao}`} detalhe={`Validade da CNH atual: ${br(r.dataValidadeCnhAtual)}`} />
            <Card titulo="Exame 03" tom={r.exame03 && r.dataUltimaEmissao && r.exame03.dataExame > r.dataUltimaEmissao && ['1', '2'].includes(r.exame03.resultado) ? 'ok' : 'erro'}
              valor={r.exame03 ? `${br(r.exame03.dataExame)} · ${r.exame03.descricaoResultado}` : 'Ausente'}
              detalhe={r.exame03 ? `Data-Validade ${br(r.exame03.dataValidade)} · última emissão ${br(r.dataUltimaEmissao)}` : ''} />
            <Card titulo="Pendências" tom={prevalidacao.pendencias.length ? 'erro' : 'ok'} valor={prevalidacao.pendencias.length || 'Nenhuma'}
              detalhe={prevalidacao.pendencias.join(' · ') || 'Requisitos impeditivos atendidos'} />
            <Card titulo="Pré-validação" tom={pode ? 'ok' : 'erro'} valor={pode ? 'Liberada' : 'Bloqueada'}
              detalhe={pode ? 'Simulação pode ser executada' : 'Corrija as pendências'} />
          </div>

          <div className="painel">
            <h3>Resumo para revisão</h3>
            <dl className="campos">
              <div><dt>Condutor</dt><dd>{r.condutor}</dd></div>
              <div><dt>Número-REGISTRO</dt><dd>{r.numeroRegistro}</dd></div>
              <div><dt>Motivo-Requerimento</dt><dd>5 — Renovação de Exames</dd></div>
              <div><dt>Categoria</dt><dd>{r.categoria} (atual {r.categoriaAtual})</dd></div>
              <div><dt>Última emissão não cancelada</dt><dd>{br(r.dataUltimaEmissao)}</dd></div>
              <div><dt>Data-Validade da nova CNH</dt><dd>{br(r.dataValidadeNovaCnh)}</dd></div>
              <div><dt>Observações (quadro CNH)</dt><dd><code>{r.observacoesNovaCnh}</code></dd></div>
              <div><dt>Processo estadual</dt><dd>{r.processoEstadualReferencia ?? '—'} <small className="muted">(referência, não é chave RENACH)</small></dd></div>
            </dl>
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
        {!pode && precisaExame && <button className="btn" onClick={() => onIr('exame')}>Registrar exame (TR 181)</button>}
        <button className="btn btn-primario" disabled={!pode || carregando} onClick={() => setConfirmar(true)}
          title={pode ? '' : 'Indisponível: há validações impeditivas pendentes'}>
          Simular autorização
        </button>
      </div>

      {resultado && (
        <div className={`painel resultado ${resultado.autorizado ? 'resultado-ok' : 'resultado-erro'}`} role="status">
          <h3>{resultado.autorizado ? 'Aceito na simulação' : 'Rejeitado na simulação'}</h3>
          <p><Retorno retorno={resultado.retorno} /></p>
          {resultado.autorizado
            ? <p>Situação-CNH demonstrativa: <strong>1 — Emissão Autorizada</strong>. A CNH operacional e o processo estadual não foram alterados.</p>
            : <p>Nenhuma alteração foi feita no prontuário.</p>}
          <button className="btn" onClick={() => onIr('consulta')}>Ver resultado na Consulta 575</button>
          <Diagnostico diag={resultado.diagnostico} />
        </div>
      )}

      <Confirmacao aberto={confirmar} titulo="Simular autorização de emissão?" rotuloConfirmar="Simular autorização"
        onCancelar={() => setConfirmar(false)} onConfirmar={() => { setConfirmar(false); onAutorizar(); }}>
        <ul className="resumo-confirmacao">
          <li>Condutor: <strong>{prontuario.dadosCadastrais.nomeCondutorCivil}</strong></li>
          <li>Motivo 5 — Renovação de Exames · categoria {form.categoria}</li>
          <li>Formulário RENACH: {form.numeroFormularioRenach} · validade {br(r?.dataValidadeNovaCnh)}</li>
        </ul>
      </Confirmacao>
    </section>
  );
}
