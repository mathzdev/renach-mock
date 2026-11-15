import { useMemo, useState } from 'react';
import { Confirmacao, Diagnostico, FonteSelo, Retorno, StatusSelo } from './componentes';
import { br, mascaraCnpj, mascaraCpf } from './fmt';

export type Form181 = Record<string, any>;

function hojeLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function form181Inicial(p: any): Form181 {
  const candidato = p?.natureza === '1';
  const tem = (c: string) => !!p?.exames?.some((e: any) => e.codigoExame === c);
  // Candidato: começa pelo primeiro exame que falta na ordem do processo (03, 04, 05, 02)
  const codigo = candidato ? (['03', '04', '05', '02'].find((c) => !tem(c)) ?? '02') : '03';
  const categoria = candidato ? (p?.exames?.find((e: any) => e.codigoExame === '03')?.categoriaPretendida || 'B') : p?.dadosControle?.categoriaAtual ?? '';
  return {
    tipoChave: candidato ? '1' : '2',
    numero: candidato ? p.formularioRenachEmAndamento : p?.numeroRegistro ?? '',
    tipoEvento: 'E',
    tipoAtualizacao: tem(codigo) ? 'S' : 'I',
    codigoExame: codigo,
    dataExame: hojeLocal(),
    resultado: '',
    dataValidade: '',
    cpfExaminador1: '',
    cpfExaminador2: '',
    cnpjEntidadeCredenciada: '',
    municipioExame: '07107',
    ufExame: 'SP',
    categoriaPretendida: categoria,
    categoriaPermitida: categoria,
    observacoes: ['99'],
    restricoesXTexto: '',
    cnpjLaboratorio: '',
    numeroLaudo: '',
  };
}

const inaptoDe = (exame: string, r: string) =>
  !!r && (exame === '03' ? ['4', '5'].includes(r) : exame === '04' ? ['2', '3'].includes(r) : r === '2');

/** Validação local de formato/obrigatoriedade com o catálogo de campos da API. */
export function validarLocal(campos: any[], f: Form181): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const c of campos) {
    const v = f[c.chave];
    const vazio = v === undefined || v === '' || (Array.isArray(v) && !v.length);
    if (c.obrigatoriedade === 'OBRIGATORIO' && vazio) erros[c.chave] = 'Campo obrigatório.';
    else if (!vazio && typeof v === 'string' && c.formato && !new RegExp(c.formato).test(v)) erros[c.chave] = 'Formato inválido.';
  }
  if (f.codigoExame === '03' && f.resultado !== '5' && !f.dataValidade) erros.dataValidade = 'Obrigatória no Exame 03.';
  if (f.codigoExame === '04' && f.observacoes.includes('15') && !f.dataValidade) erros.dataValidade = 'Obrigatória com observação 15.';
  if (!['05', '06', '07'].includes(f.codigoExame) && !f.cpfExaminador1) erros.cpfExaminador1 = 'Selecione o profissional.';
  if (!inaptoDe(f.codigoExame, f.resultado) && !f.categoriaPermitida) erros.categoriaPermitida = 'Obrigatória para resultado apto.';
  if (f.observacoes.includes('X') && !f.restricoesXTexto) erros.restricoesXTexto = 'Obrigatório com a observação X.';
  return erros;
}

function idade(nasc: string, ref: string) {
  const [ny, nm, nd] = nasc.split('-').map(Number);
  const [ry, rm, rd] = ref.split('-').map(Number);
  return ry - ny - (rm < nm || (rm === nm && rd < nd) ? 1 : 0);
}

interface Props {
  catalogos: any;
  prontuario: any;
  form: Form181;
  setForm: (f: Form181) => void;
  resultado: any;
  enviando: boolean;
  onEnviar: () => void;
  onLimpar: () => void;
  onIr: (etapa: any) => void;
  /** Próxima etapa sugerida após o aceite (renovação: TR 159; primeira habilitação: TR 155). */
  proximo?: { rotulo: string; etapa: string };
  /** Dentro da tela de Eventos da primeira habilitação: sem cabeçalho próprio. */
  embutido?: boolean;
}

const GRUPOS = ['Condutor/Prontuário', 'Dados do Exame', 'Resultado', 'Profissional', 'Entidade Credenciada', 'Categoria', 'Observações e Restrições'];

export function Registro181({ catalogos, prontuario, form, setForm, resultado, enviando, onEnviar, onLimpar, onIr, proximo, embutido }: Props) {
  const [tentou, setTentou] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const campos: any[] = catalogos.camposTr181;
  const porChave = useMemo(() => Object.fromEntries(campos.map((c) => [c.chave, c])), [campos]);
  const errosLocais = validarLocal(campos, form);
  const errosServidor: string[] = resultado && !resultado.aceito ? resultado.camposComErro : [];
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const erroDe = (k: string) => (tentou ? errosLocais[k] : undefined) ?? (errosServidor.includes(k) ? 'Verifique este campo (retorno da simulação).' : undefined);

  function campo(k: string, input: React.ReactNode, opts: { esconder?: boolean } = {}) {
    const c = porChave[k];
    if (!c || opts.esconder) return null;
    const erro = erroDe(k);
    return (
      <label key={k} className={erro ? 'com-erro' : ''}>
        <span className="rotulo">
          {c.seq ? <span className="seq">{c.seq}</span> : null}
          {c.rotulo}
          {c.obrigatoriedade === 'OBRIGATORIO' && <span className="obrig" aria-label="obrigatório"> *</span>}
          {c.obrigatoriedade === 'CONDICIONAL' && <span className="tag-cond">condicional</span>}
          <small className="pos">pos. {c.posicao}</small>
        </span>
        {input}
        {erro ? <span className="erro-campo" role="alert">{erro}</span> : <span className="ajuda">{c.condicao ?? c.ajuda}</span>}
      </label>
    );
  }

  if (!prontuario) {
    return (
      <section className="painel">
        <h2>Registro de exame — TR 181</h2>
        <p>Consulte um prontuário na TR 575 (ou cadastre um candidato na TR 151) antes de registrar o exame.</p>
        <button className="btn btn-primario" onClick={() => onIr('consulta')}>Ir para a Consulta 575</button>
      </section>
    );
  }

  const resultados: Record<string, string> = catalogos.resultadosPorExame[form.codigoExame] ?? {};
  const existente = prontuario.exames.find((e: any) => e.codigoExame === form.codigoExame);
  const prof = catalogos.profissionais.find((x: any) => x.cpf === form.cpfExaminador1);
  const ent = catalogos.entidades.find((x: any) => x.cnpj === form.cnpjEntidadeCredenciada);
  const idadeExame = form.dataExame ? idade(prontuario.dadosCadastrais.dataNascimento, form.dataExame) : null;
  const maxAnos = idadeExame === null ? null : form.dataExame >= '2021-04-12' ? (idadeExame >= 70 ? 3 : idadeExame >= 50 ? 5 : 10) : idadeExame > 65 ? 3 : 5;
  const aceitaValidade = ['03', '04'].includes(form.codigoExame);
  const toggleObs = (k: string) => {
    let obs: string[] = form.observacoes.includes(k) ? form.observacoes.filter((x: string) => x !== k) : [...form.observacoes, k];
    if (k === '99' && obs.includes('99')) obs = ['99'];
    else if (k !== '99') obs = obs.filter((x) => x !== '99');
    setForm({ ...form, observacoes: obs.length ? obs : ['99'], restricoesXTexto: obs.includes('X') ? form.restricoesXTexto : '' });
  };

  function tentarEnviar() {
    setTentou(true);
    if (Object.keys(validarLocal(campos, form)).length === 0) setConfirmar(true);
  }

  const conteudo: Record<string, React.ReactNode[]> = {
    'Condutor/Prontuário': [
      campo('tipoChave', (
        <select value={form.tipoChave} onChange={(e) => set('tipoChave', e.target.value)}>
          <option value="2">2 – Número-Registro</option>
          <option value="1">1 – Número-Formulário-RENACH (só candidato)</option>
        </select>
      )),
      campo('numero', <input value={form.numero} maxLength={11} onChange={(e) => set('numero', e.target.value.toUpperCase())} />),
      campo('tipoAtualizacao', (
        <select value={form.tipoAtualizacao} onChange={(e) => set('tipoAtualizacao', e.target.value)}>
          <option value="I">I – Inclusão</option>
          <option value="S">S – Substituição</option>
        </select>
      )),
    ],
    'Dados do Exame': [
      campo('tipoEvento', <input value="E – Exame" readOnly />),
      campo('codigoExame', (
        <select value={form.codigoExame} onChange={(e) => {
          const c = e.target.value;
          const tem = prontuario.exames.some((x: any) => x.codigoExame === c);
          setForm({
            ...form, codigoExame: c, resultado: '', tipoAtualizacao: tem ? 'S' : 'I',
            dataValidade: ['03', '04'].includes(c) ? form.dataValidade : '',
            cpfExaminador1: ['05', '06', '07'].includes(c) ? '' : form.cpfExaminador1,
            observacoes: ['03', '04'].includes(c) ? form.observacoes : ['99'], restricoesXTexto: ['03', '04'].includes(c) ? form.restricoesXTexto : '',
          });
        }}>
          {Object.entries(catalogos.exames).map(([k, v]: any) => <option key={k} value={k}>{k} — {v}</option>)}
        </select>
      )),
      campo('dataExame', <input type="date" value={form.dataExame} onChange={(e) => set('dataExame', e.target.value)} />),
      campo('municipioExame', (
        <select value={form.municipioExame} onChange={(e) => setForm({ ...form, municipioExame: e.target.value, ufExame: catalogos.municipios[e.target.value]?.uf ?? form.ufExame })}>
          {Object.entries(catalogos.municipios).map(([k, v]: any) => <option key={k} value={k}>{k} – {v.nome}/{v.uf}</option>)}
        </select>
      )),
      campo('ufExame', (
        <select value={form.ufExame} onChange={(e) => set('ufExame', e.target.value)}>
          {catalogos.ufs.map((u: string) => <option key={u}>{u}</option>)}
        </select>
      )),
    ],
    Resultado: [
      campo('resultado', (
        <select value={form.resultado} onChange={(e) => {
          const r = e.target.value;
          setForm({ ...form, resultado: r, categoriaPermitida: inaptoDe(form.codigoExame, r) ? '' : form.categoriaPermitida || form.categoriaPretendida || prontuario.dadosControle.categoriaAtual });
        }}>
          <option value="">Selecione…</option>
          {Object.entries(resultados).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
        </select>
      )),
      campo('dataValidade', (
        <div className="linha-input">
          <input type="date" value={form.dataValidade} onChange={(e) => set('dataValidade', e.target.value)} />
          {maxAnos && form.dataExame && (
            <button type="button" className="btn btn-pequeno" onClick={() => {
              const [y, m, d] = form.dataExame.split('-').map(Number);
              set('dataValidade', `${y + maxAnos}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            }}>Máximo ({maxAnos} anos)</button>
          )}
        </div>
      ), { esconder: !aceitaValidade }),
    ],
    Profissional: [
      <label key="selprof" className={erroDe('cpfExaminador1') ? 'com-erro' : ''}>
        <span className="rotulo">Examinador (cadastro fictício da POC)</span>
        <select value={form.cpfExaminador1} onChange={(e) => set('cpfExaminador1', e.target.value)} disabled={['05', '06', '07'].includes(form.codigoExame)}>
          <option value="">{['05', '06', '07'].includes(form.codigoExame) ? 'Não se aplica (prova eletrônica)' : 'Selecione…'}</option>
          {catalogos.profissionais.map((p: any) => (
            <option key={p.cpf} value={p.cpf}>{p.nome} — {p.funcao} — {catalogos.entidades.find((x: any) => x.cnpj === p.entidade)?.nome}</option>
          ))}
        </select>
        <span className="ajuda">Preenche o CPF-Examinador 1. O vínculo com a entidade é conferido (retorno 639).</span>
      </label>,
      campo('cpfExaminador1', <input value={form.cpfExaminador1 ? mascaraCpf(form.cpfExaminador1) : ''} readOnly placeholder="Selecione o examinador" />),
    ],
    'Entidade Credenciada': [
      <label key="selent" className={erroDe('cnpjEntidadeCredenciada') ? 'com-erro' : ''}>
        <span className="rotulo">Entidade credenciada (fictícia da POC)</span>
        <select value={form.cnpjEntidadeCredenciada} onChange={(e) => set('cnpjEntidadeCredenciada', e.target.value)}>
          <option value="">Selecione…</option>
          {catalogos.entidades.filter((x: any) => x.tipo !== 'LABORATORIO').map((p: any) => <option key={p.cnpj} value={p.cnpj}>{p.nome}</option>)}
        </select>
        <span className="ajuda">Não é o cadastro operacional do Portal da Clínica.</span>
      </label>,
      campo('cnpjEntidadeCredenciada', <input value={form.cnpjEntidadeCredenciada ? mascaraCnpj(form.cnpjEntidadeCredenciada) : ''} readOnly placeholder="Selecione a entidade" />),
      campo('cnpjLaboratorio', <input value={form.cnpjLaboratorio} inputMode="numeric" maxLength={14} placeholder="Opcional" onChange={(e) => set('cnpjLaboratorio', e.target.value.replace(/\D/g, ''))} />),
      campo('numeroLaudo', <input value={form.numeroLaudo} maxLength={17} placeholder="Opcional" onChange={(e) => set('numeroLaudo', e.target.value.toUpperCase())} />),
    ],
    Categoria: [
      campo('categoriaPretendida', (
        <select value={form.categoriaPretendida} onChange={(e) => set('categoriaPretendida', e.target.value)}>
          <option value="">Selecione…</option>
          {catalogos.categorias.map((c: string) => <option key={c}>{c}</option>)}
        </select>
      )),
      campo('categoriaPermitida', (
        <select value={form.categoriaPermitida} onChange={(e) => set('categoriaPermitida', e.target.value)}>
          <option value="">— (inapto)</option>
          {catalogos.categorias.map((c: string) => <option key={c}>{c}</option>)}
        </select>
      )),
    ],
    'Observações e Restrições': [
      campo('observacoes', (
        <div className="checks checks-grade">
          {(aceitaValidade ? Object.entries(catalogos.observacoes) : [['99', catalogos.observacoes['99']]]).map(([k, v]: any) => (
            <label key={k} className="check"><input type="checkbox" checked={form.observacoes.includes(k)} onChange={() => toggleObs(k)} /><span><strong>{k}</strong> {v}</span></label>
          ))}
          {aceitaValidade && (
            <details className="restricoes">
              <summary>Restrições médicas (Tabela 09){form.observacoes.filter((o: string) => /^[A-Z]$/.test(o)).length ? `: ${form.observacoes.filter((o: string) => /^[A-Z]$/.test(o)).join(', ')}` : ''}</summary>
              {Object.entries(catalogos.restricoes).map(([k, v]: any) => (
                <label key={k} className="check"><input type="checkbox" checked={form.observacoes.includes(k)} onChange={() => toggleObs(k)} /><span><strong>{k}</strong> {v}</span></label>
              ))}
            </details>
          )}
        </div>
      )),
      campo('restricoesXTexto', <textarea rows={2} maxLength={88} value={form.restricoesXTexto} onChange={(e) => set('restricoesXTexto', e.target.value)} />, { esconder: !form.observacoes.includes('X') }),
    ],
  };

  return (
    <section aria-labelledby="t181">
      {embutido ? <h3 id="t181" className="sr-only">Registro de exame</h3> : (
        <header className="pagina-topo">
          <div>
            <p className="trilha">RENACH › Eventos › TR 181 – Eventos · Tipo-Evento E (Exame)</p>
            <h2 id="t181">Registro de exame</h2>
          </div>
        </header>
      )}

      <p className="nota">
        Leiaute do Manual RENACH v8.2 <FonteSelo fonte="MANUAL" />: identificação (Tipo-Chave e Número) e os 16 atributos do Evento E, nas posições 051 a 273.
        {existente ? ` Já existe Exame ${form.codigoExame} de ${br(existente.dataExame)} no prontuário: um exame novo é registrado como S – Substituição.` : ''}
      </p>

      <form className="form-grupos" onSubmit={(e) => { e.preventDefault(); tentarEnviar(); }} noValidate>
        {GRUPOS.map((g) => {
          const itens = conteudo[g].filter(Boolean);
          if (!itens.length) return null;
          return (
            <fieldset key={g} className="painel">
              <legend>{g}</legend>
              <div className="grade-campos">{itens}</div>
            </fieldset>
          );
        })}
        <div className="acoes-pagina barra-fixa">
          <button type="button" className="btn" onClick={() => { setTentou(false); onLimpar(); }}>Limpar formulário</button>
          <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Processando…' : 'Registrar exame (simulação)'}</button>
        </div>
      </form>

      {resultado && (
        <div className={`painel resultado ${resultado.aceito ? 'resultado-ok' : 'resultado-erro'}`} role="status">
          <h3>{resultado.aceito ? 'Aceito na simulação' : 'Rejeitado na simulação'}</h3>
          <p><Retorno retorno={resultado.retorno} /></p>
          {resultado.aceito ? (
            <>
              <p>
                Exame {resultado.evento.codigoExame} de {br(resultado.evento.dataExame)} registrado no prontuário em memória.
                {resultado.situacaoCnh.antes !== resultado.situacaoCnh.depois &&
                  ` Situação-CNH: ${resultado.situacaoCnh.antes} → ${resultado.situacaoCnh.depois} – ${catalogos.situacoesCnh[resultado.situacaoCnh.depois]}.`}
              </p>
              <div className="acoes">
                <button className="btn" onClick={() => onIr('consulta')}>Conferir na Consulta 575</button>
                <button className="btn btn-primario" onClick={() => onIr(proximo?.etapa ?? 'autorizacao')}>{proximo?.rotulo ?? 'Seguir para Autorização (TR 159) →'}</button>
              </div>
            </>
          ) : <p>Nenhuma alteração foi feita no prontuário. Campos relacionados estão destacados.</p>}
          <details>
            <summary>Validações executadas ({resultado.validacoes.length})</summary>
            <ul className="lista-validacoes">
              {resultado.validacoes.map((v: any) => (
                <li key={v.id}><StatusSelo status={v.status} /> <strong>{v.titulo}</strong> — {v.detalhe} <FonteSelo fonte={v.fonte} />{v.referencia && <small className="ref"> [{v.referencia}]</small>}</li>
              ))}
            </ul>
          </details>
          <Diagnostico diag={resultado.diagnostico} />
        </div>
      )}

      <Confirmacao aberto={confirmar} titulo="Registrar exame (simulação)?" rotuloConfirmar="Registrar exame (simulação)"
        onCancelar={() => setConfirmar(false)} onConfirmar={() => { setConfirmar(false); onEnviar(); }}>
        <ul className="resumo-confirmacao">
          <li>{prontuario.natureza === '1' ? 'Candidato' : 'Condutor'}: <strong>{prontuario.dadosCadastrais.nomeCondutorCivil}</strong></li>
          <li>{form.tipoAtualizacao === 'S' ? 'Substituição' : 'Inclusão'} do Exame {form.codigoExame} em {br(form.dataExame)} — resultado {form.resultado} ({resultados[form.resultado]})</li>
          {form.dataValidade && <li>Data-Validade: {br(form.dataValidade)}</li>}
          <li>Examinador: {prof?.nome ?? '—'} · Entidade: {ent?.nome ?? '—'}</li>
          <li>Observações: {form.observacoes.join(', ')}</li>
        </ul>
      </Confirmacao>
    </section>
  );
}
