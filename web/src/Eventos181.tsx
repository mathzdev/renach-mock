import { ReactNode, useState } from 'react';
import { Confirmacao, Diagnostico, FonteSelo, Retorno, Selo, StatusSelo } from './componentes';
import { br, mascaraCnpj, mascaraCpf } from './fmt';
import { Form181, Registro181 } from './Registro181';

export type FormCurso = Record<string, string>;

function hojeLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Valores padrão por curso de formação (carga mínima do Curso 34 em minutos: 150). */
function padraoCurso(codigo: string, p: any): Partial<FormCurso> {
  const cat03 = p?.exames?.find((e: any) => e.codigoExame === '03')?.categoriaPretendida ?? 'B';
  return {
    '31': { cargaHoraria: '45', categoria: '' },
    '32': { cargaHoraria: '20', categoria: 'B' },
    '33': { cargaHoraria: '20', categoria: /X/.test(cat03) ? 'X' : 'A' },
    '34': { cargaHoraria: '150', categoria: 'B' },
  }[codigo] ?? {};
}

export function formCursoInicial(p: any): FormCurso {
  const tem = (c: string) => !!p?.cursos?.some((x: any) => x.codigoCurso === c);
  const codigo = ['31', '34', '32'].find((c) => !tem(c)) ?? '32';
  return {
    tipoChave: '1', numero: p?.formularioRenachEmAndamento ?? '', tipoEvento: 'C', tipoAtualizacao: tem(codigo) ? 'S' : 'I', codigoCurso: codigo,
    modalidade: '', numeroCertificado: '', dataInicioCurso: hojeLocal(), dataFimCurso: hojeLocal(), cargaHoraria: '', cnpjEntidadeCredenciada: '',
    cpfInstrutor: '', municipioCurso: '07107', ufCurso: 'SP', dataValidade: '', categoria: '', observacoesCurso: '99', ...padraoCurso(codigo, p),
  };
}

/** Eventos exigidos no Motivo 1 (quadros Curso x Motivo e Exame x Motivo da TR 155). */
export function eventosExigidos(p: any, categoria = 'B') {
  const ex = (c: string) => p?.exames?.find((e: any) => e.codigoExame === c);
  const cu = (c: string) => p?.cursos?.find((e: any) => e.codigoCurso === c);
  const apto = (e: any) => e && (e.codigoExame === '03' ? ['1', '2'].includes(e.resultado) : e.resultado === '1');
  const itens: { id: string; rotulo: string; ok: boolean; detalhe: string; tipo: 'E' | 'C' }[] = [
    { id: '03', rotulo: 'Exame 03 – Aptidão Física e Mental', ok: apto(ex('03')), detalhe: ex('03') ? `${br(ex('03').dataExame)} · ${ex('03').descricaoResultado ?? ex('03').resultado}` : 'pendente', tipo: 'E' },
    { id: '04', rotulo: 'Exame 04 – Avaliação Psicológica', ok: apto(ex('04')), detalhe: ex('04') ? `${br(ex('04').dataExame)} · ${ex('04').descricaoResultado ?? ex('04').resultado}` : 'pendente', tipo: 'E' },
    { id: '31', rotulo: 'Curso 31 – Aulas Teóricas', ok: !!cu('31'), detalhe: cu('31') ? `até ${br(cu('31').dataFimCurso)}` : 'pendente', tipo: 'C' },
    { id: '05', rotulo: 'Exame 05 – Teórico Técnico', ok: apto(ex('05')), detalhe: ex('05') ? `${br(ex('05').dataExame)} · ${ex('05').descricaoResultado ?? ex('05').resultado}` : 'pendente', tipo: 'E' },
  ];
  if (/B/.test(categoria)) {
    itens.push(
      { id: '34', rotulo: 'Curso 34 – Simulador (categoria B)', ok: !!cu('34'), detalhe: cu('34') ? `${Number(cu('34').cargaHoraria)} min` : 'pendente', tipo: 'C' },
      { id: '32', rotulo: 'Curso 32 – Aulas Práticas 4 Rodas', ok: !!cu('32'), detalhe: cu('32') ? `até ${br(cu('32').dataFimCurso)}` : 'pendente', tipo: 'C' },
      { id: '02', rotulo: 'Exame 02 – Prática 4 Rodas', ok: apto(ex('02')), detalhe: ex('02') ? `${br(ex('02').dataExame)} · ${ex('02').descricaoResultado ?? ex('02').resultado}` : 'pendente', tipo: 'E' },
    );
  }
  if (/^[AX]/.test(categoria)) {
    itens.push(
      { id: '33', rotulo: 'Curso 33 – Aulas Práticas 2 Rodas', ok: !!cu('33'), detalhe: cu('33') ? `até ${br(cu('33').dataFimCurso)}` : 'pendente', tipo: 'C' },
      { id: '01', rotulo: 'Exame 01 – Prática 2 Rodas', ok: apto(ex('01')), detalhe: ex('01') ? `${br(ex('01').dataExame)} · ${ex('01').descricaoResultado ?? ex('01').resultado}` : 'pendente', tipo: 'E' },
    );
  }
  return itens;
}

interface Props {
  catalogos: any;
  prontuario: any;
  aba: 'E' | 'C';
  setAba: (a: 'E' | 'C') => void;
  form181: Form181;
  setForm181: (f: Form181) => void;
  resultado181: any;
  formCurso: FormCurso;
  setFormCurso: (f: FormCurso) => void;
  resultadoCurso: any;
  enviando: boolean;
  onEnviarExame: () => void;
  onEnviarCurso: () => void;
  onLimparExame: () => void;
  onLimparCurso: () => void;
  onIr: (etapa: string) => void;
}

export function Eventos181(props: Props) {
  const { catalogos, prontuario, aba, setAba, form181, setForm181, formCurso, setFormCurso, onIr } = props;
  if (!prontuario || prontuario.natureza !== '1') {
    return (
      <section className="painel">
        <h2>Eventos do candidato — TR 181</h2>
        <p>Cadastre um candidato na TR 151 ou continue um processo da massa fictícia antes de registrar exames e cursos.</p>
        <button className="btn btn-primario" onClick={() => onIr('cadastro')}>Ir para o Cadastro (TR 151)</button>
      </section>
    );
  }
  const categoria = form181.categoriaPretendida || 'B';
  const itens = eventosExigidos(prontuario, categoria);
  const abrir = (i: { id: string; tipo: 'E' | 'C' }) => {
    if (i.tipo === 'E') {
      const tem = prontuario.exames.some((x: any) => x.codigoExame === i.id);
      setForm181({ ...form181, codigoExame: i.id, tipoAtualizacao: tem ? 'S' : 'I', resultado: '', dataValidade: '', cpfExaminador1: '', cnpjEntidadeCredenciada: '',
        observacoes: ['99'], restricoesXTexto: '', categoriaPretendida: i.id === '01' ? (/X/.test(categoria) ? 'X' : 'A') : i.id === '02' ? 'B' : categoria,
        categoriaPermitida: i.id === '01' ? (/X/.test(categoria) ? 'X' : 'A') : i.id === '02' ? 'B' : categoria });
      setAba('E');
    } else {
      const tem = prontuario.cursos.some((x: any) => x.codigoCurso === i.id);
      setFormCurso({ ...formCurso, codigoCurso: i.id, tipoAtualizacao: tem ? 'S' : 'I', ...padraoCurso(i.id, prontuario) });
      setAba('C');
    }
  };

  return (
    <section aria-labelledby="tev">
      <header className="pagina-topo">
        <div>
          <p className="trilha">RENACH › Eventos › TR 181 – Eventos · Tipo de chave 1 (Formulário RENACH)</p>
          <h2 id="tev">Exames e cursos do candidato</h2>
        </div>
      </header>

      <div className="painel">
        <h3>Eventos exigidos para a primeira habilitação · categoria {categoria}</h3>
        <p className="nota nota-tecnica">Quadros Curso x Motivo e Exame x Motivo da TR 155 <FonteSelo fonte="MANUAL" />. Clique em um item para abrir o formulário dele.</p>
        <ul className="lista-eventos">
          {itens.map((i) => (
            <li key={i.id}>
              <Selo tipo={i.ok ? 'ok' : 'aviso'}>{i.ok ? 'OK' : 'Falta'}</Selo>
              <span><button type="button" className="btn btn-pequeno btn-fantasma" onClick={() => abrir(i)}>{i.rotulo}</button> <small className="muted">{i.detalhe}</small></span>
            </li>
          ))}
        </ul>
        {itens.every((i) => i.ok) && (
          <div className="acoes"><button className="btn btn-primario" onClick={() => onIr('habilitacao')}>Eventos completos: seguir para Habilitação (TR 155) →</button></div>
        )}
      </div>

      <div className="abas" role="tablist" aria-label="Tipo de evento">
        <button type="button" role="tab" className="aba" aria-selected={aba === 'E'} onClick={() => setAba('E')}>E – Exame</button>
        <button type="button" role="tab" className="aba" aria-selected={aba === 'C'} onClick={() => setAba('C')}>C – Curso</button>
      </div>

      {aba === 'E' ? (
        <Registro181 catalogos={catalogos} prontuario={prontuario} form={form181} setForm={setForm181} resultado={props.resultado181}
          enviando={props.enviando} onEnviar={props.onEnviarExame} onLimpar={props.onLimparExame} onIr={onIr} embutido
          proximo={{ rotulo: 'Seguir para Habilitação (TR 155) →', etapa: 'habilitacao' }} />
      ) : (
        <RegistroCurso catalogos={catalogos} prontuario={prontuario} form={formCurso} setForm={setFormCurso} resultado={props.resultadoCurso}
          enviando={props.enviando} onEnviar={props.onEnviarCurso} onLimpar={props.onLimparCurso} onIr={onIr} />
      )}
    </section>
  );
}

const OBRIG_CURSO = ['tipoAtualizacao', 'codigoCurso', 'dataInicioCurso', 'dataFimCurso', 'cargaHoraria', 'cnpjEntidadeCredenciada', 'cpfInstrutor', 'municipioCurso', 'ufCurso'];

function RegistroCurso({ catalogos, prontuario, form, setForm, resultado, enviando, onEnviar, onLimpar, onIr }: {
  catalogos: any; prontuario: any; form: FormCurso; setForm: (f: FormCurso) => void; resultado: any; enviando: boolean;
  onEnviar: () => void; onLimpar: () => void; onIr: (etapa: string) => void;
}) {
  const [tentou, setTentou] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  const exigeCategoria = ['32', '33'].includes(form.codigoCurso);
  const errosLocais: Record<string, string> = Object.fromEntries(OBRIG_CURSO.filter((k) => !form[k]).map((k) => [k, 'Campo obrigatório.']));
  if (exigeCategoria && !form.categoria) errosLocais.categoria = 'Obrigatória nos cursos 32 e 33.';
  const errosServidor: string[] = resultado && !resultado.aceito ? resultado.camposComErro : [];
  const erroDe = (k: string) => (tentou ? errosLocais[k] : undefined) ?? (errosServidor.includes(k) ? 'Verifique este campo (retorno da simulação).' : undefined);
  const existente = prontuario.cursos.find((c: any) => c.codigoCurso === form.codigoCurso);
  const instrutor = catalogos.profissionais.find((p: any) => p.cpf === form.cpfInstrutor);
  const ent = catalogos.entidades.find((x: any) => x.cnpj === form.cnpjEntidadeCredenciada);

  const campo = (k: string, rotulo: string, pos: string, input: ReactNode, ajuda?: string, obrig = OBRIG_CURSO.includes(k)) => {
    const erro = erroDe(k);
    return (
      <label key={k} className={erro ? 'com-erro' : ''}>
        <span className="rotulo">{rotulo}{obrig && <span className="obrig" aria-label="obrigatório"> *</span>}<small className="pos">pos. {pos}</small></span>
        {input}
        {erro ? <span className="erro-campo" role="alert">{erro}</span> : ajuda ? <span className="ajuda">{ajuda}</span> : null}
      </label>
    );
  };

  return (
    <>
      <p className="nota nota-tecnica">
        Tipo de evento C (Curso), posições 051 a 152 <FonteSelo fonte="MANUAL" />. Cursos de formação 31 a 34: sem Modalidade e sem Data de validade.
        {existente ? ` Já existe Curso ${form.codigoCurso} (${br(existente.dataFimCurso)}): um novo envio é S – Substituição.` : ''}
      </p>
      <form className="form-grupos" onSubmit={(e) => { e.preventDefault(); setTentou(true); if (!Object.keys(errosLocais).length) setConfirmar(true); }} noValidate>
        <fieldset className="painel">
          <legend>Curso</legend>
          <div className="grade-campos">
            {campo('numero', 'Número do formulário RENACH (Tipo de chave 1)', '038–049', <input value={form.numero} readOnly />)}
            {campo('codigoCurso', 'Curso', '052–053', (
              <select value={form.codigoCurso} onChange={(e) => {
                const c = e.target.value;
                const tem = prontuario.cursos.some((x: any) => x.codigoCurso === c);
                setForm({ ...form, codigoCurso: c, tipoAtualizacao: tem ? 'S' : 'I', ...padraoCurso(c, prontuario) });
              }}>
                {['31', '32', '33', '34'].map((c) => <option key={c} value={c}>{c} — {catalogos.cursos[c]}</option>)}
              </select>
            ))}
            {campo('tipoAtualizacao', 'Tipo de atualização', '051', (
              <select value={form.tipoAtualizacao} onChange={(e) => set('tipoAtualizacao', e.target.value)}>
                <option value="I">I – Inclusão</option><option value="S">S – Substituição</option>
              </select>
            ))}
            {campo('dataInicioCurso', 'Início do curso', '070–077', <input type="date" value={form.dataInicioCurso} onChange={(e) => set('dataInicioCurso', e.target.value)} />)}
            {campo('dataFimCurso', 'Fim do curso', '078–085', <input type="date" value={form.dataFimCurso} onChange={(e) => set('dataFimCurso', e.target.value)} />)}
            {campo('cargaHoraria', form.codigoCurso === '34' ? 'Carga horária (minutos)' : 'Carga horária (horas)', '086–088',
              <input value={form.cargaHoraria} inputMode="numeric" maxLength={3} onChange={(e) => set('cargaHoraria', e.target.value.replace(/\D/g, ''))} />,
              form.codigoCurso === '34' ? 'No Curso 34 a carga é em minutos, mínimo 150 (593).' : 'Até 3 dígitos.')}
            {campo('numeroCertificado', 'Número do certificado', '055–069', <input value={form.numeroCertificado} maxLength={15} placeholder="Opcional" onChange={(e) => set('numeroCertificado', e.target.value.toUpperCase())} />)}
            {campo('categoria', 'Categoria', '129–132', (
              <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                <option value="">—</option>
                {catalogos.categoriasCandidato.map((c: string) => <option key={c}>{c}</option>)}
              </select>
            ), form.codigoCurso === '33' ? 'Curso 33: X ou A (382).' : form.codigoCurso === '32' ? 'Curso 32: B para candidato (383/345).' : 'Opcional neste curso.', exigeCategoria)}
          </div>
        </fieldset>
        <fieldset className="painel">
          <legend>CFC, instrutor e local</legend>
          <div className="grade-campos">
            <label key="selinst" className={erroDe('cpfInstrutor') ? 'com-erro' : ''}>
              <span className="rotulo">Instrutor (cadastro fictício da POC)</span>
              <select value={form.cpfInstrutor} onChange={(e) => {
                const prof = catalogos.profissionais.find((p: any) => p.cpf === e.target.value);
                setForm({ ...form, cpfInstrutor: e.target.value, cnpjEntidadeCredenciada: prof?.entidade ?? form.cnpjEntidadeCredenciada });
              }}>
                <option value="">Selecione…</option>
                {catalogos.profissionais.map((p: any) => (
                  <option key={p.cpf} value={p.cpf}>{p.nome} — {p.funcao} — {catalogos.entidades.find((x: any) => x.cnpj === p.entidade)?.nome}</option>
                ))}
              </select>
              <span className="ajuda">Preenche CPF do instrutor e o CNPJ do CFC. Função e tipo de entidade são conferidos (662).</span>
            </label>
            {campo('cpfInstrutor', 'CPF do instrutor', '103–113', <input value={form.cpfInstrutor ? mascaraCpf(form.cpfInstrutor) : ''} readOnly placeholder="Selecione o instrutor" />)}
            {campo('cnpjEntidadeCredenciada', 'CNPJ da entidade credenciada', '089–102', <input value={form.cnpjEntidadeCredenciada ? mascaraCnpj(form.cnpjEntidadeCredenciada) : ''} readOnly placeholder="Vem do instrutor" />)}
            {campo('municipioCurso', 'Município do curso', '114–118', (
              <select value={form.municipioCurso} onChange={(e) => setForm({ ...form, municipioCurso: e.target.value, ufCurso: catalogos.municipios[e.target.value]?.uf ?? form.ufCurso })}>
                {Object.entries(catalogos.municipios).map(([k, v]: any) => <option key={k} value={k}>{k} – {v.nome}/{v.uf}</option>)}
              </select>
            ))}
            {campo('ufCurso', 'UF do curso', '119–120', (
              <select value={form.ufCurso} onChange={(e) => set('ufCurso', e.target.value)}>{catalogos.ufs.map((u: string) => <option key={u}>{u}</option>)}</select>
            ))}
            {campo('observacoesCurso', 'Observações do curso', '133–152', <input value="99 – Sem observação" readOnly />)}
          </div>
        </fieldset>
        <div className="acoes-pagina barra-fixa">
          <button type="button" className="btn" onClick={() => { setTentou(false); onLimpar(); }}>Limpar formulário</button>
          <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Processando…' : 'Registrar curso (simulação)'}</button>
        </div>
      </form>

      {resultado && (
        <div className={`painel resultado ${resultado.aceito ? 'resultado-ok' : 'resultado-erro'}`} role="status">
          <h3>{resultado.aceito ? 'Aceito na simulação' : 'Rejeitado na simulação'}</h3>
          <p><Retorno retorno={resultado.retorno} /></p>
          {resultado.aceito ? (
            <>
              <p>Curso {resultado.evento.codigoCurso} registrado no prontuário em memória do candidato.</p>
              <div className="acoes">
                <button className="btn" onClick={() => onIr('consulta')}>Conferir na Consulta 575</button>
                <button className="btn btn-primario" onClick={() => onIr('habilitacao')}>Seguir para Habilitação (TR 155) →</button>
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

      <Confirmacao aberto={confirmar} titulo="Registrar curso (simulação)?" rotuloConfirmar="Registrar curso (simulação)"
        onCancelar={() => setConfirmar(false)} onConfirmar={() => { setConfirmar(false); onEnviar(); }}>
        <ul className="resumo-confirmacao">
          <li>Candidato: <strong>{prontuario.dadosCadastrais.nomeCondutorCivil}</strong></li>
          <li>{form.tipoAtualizacao === 'S' ? 'Substituição' : 'Inclusão'} do Curso {form.codigoCurso} – {catalogos.cursos[form.codigoCurso]}</li>
          <li>{br(form.dataInicioCurso)} a {br(form.dataFimCurso)} · carga {form.cargaHoraria} {form.codigoCurso === '34' ? 'min' : 'h'}</li>
          <li>Instrutor: {instrutor?.nome ?? '—'} · {ent?.nome ?? '—'}</li>
        </ul>
      </Confirmacao>
    </>
  );
}
