import { ReactNode, useState } from 'react';
import { Confirmacao, Diagnostico, FonteSelo, Retorno, StatusSelo } from './componentes';
import { br, mascaraCpf } from './fmt';

export type Form151 = Record<string, string>;

function hojeLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function form151Inicial(): Form151 {
  return {
    numeroFormularioRenach: '', nomeCandidatoCivil: '', dataNascimento: '', sexo: '', nomeMae: '', nomePai: '',
    docTipo: '1', docNumero: '', docOrgao: '', docUf: 'SP', cpf: '', localidadeNascimento: '', nacionalidade: '1',
    enderecoLogradouro: '', enderecoNumero: '', enderecoComplemento: '', enderecoBairro: '', enderecoCep: '', enderecoMunicipio: '', enderecoUf: 'SP',
    dataCadastramento: hojeLocal(), ddd: '', telefoneCelular: '', email: '', nomeSocial: '', filiacaoAfetiva1: '', filiacaoAfetiva2: '',
  };
}

/** Candidato FICTÍCIO para a demonstração (CPF com prefixo 000 e dígitos verificadores válidos). */
const FICTICIO: Form151 = {
  ...form151Inicial(),
  numeroFormularioRenach: 'SP926060022', nomeCandidatoCivil: 'BRUNO TEIXEIRA ARAGAO', dataNascimento: '2004-08-15', sexo: '1',
  nomeMae: 'HELENA TEIXEIRA ARAGAO', docNumero: '900600220', docOrgao: 'SSP', cpf: '00000000604', localidadeNascimento: '06291',
  enderecoLogradouro: 'RUA DEMONSTRATIVA DAS PALMEIRAS', enderecoNumero: '60', enderecoBairro: 'JARDIM MODELO', enderecoCep: '13000600',
  enderecoMunicipio: '06291', ddd: '19', telefoneCelular: '900000602', email: 'bruno.candidato@exemplo.invalid',
};

const OBRIGATORIOS = ['numeroFormularioRenach', 'nomeCandidatoCivil', 'dataNascimento', 'sexo', 'nomeMae', 'docTipo', 'docNumero', 'docOrgao', 'docUf', 'cpf',
  'localidadeNascimento', 'nacionalidade', 'enderecoLogradouro', 'enderecoBairro', 'enderecoCep', 'enderecoMunicipio', 'enderecoUf', 'dataCadastramento'];

interface Props {
  catalogos: any;
  candidatos: any[];
  form: Form151;
  setForm: (f: Form151) => void;
  resultado: any;
  enviando: boolean;
  onEnviar: () => void;
  onContinuar: (formulario: string) => void;
  onIr: (etapa: string) => void;
}

export function Cadastro151({ catalogos, candidatos, form, setForm, resultado, enviando, onEnviar, onContinuar, onIr }: Props) {
  const [tentou, setTentou] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  const errosLocais = Object.fromEntries(OBRIGATORIOS.filter((k) => !form[k]?.trim()).map((k) => [k, 'Campo obrigatório.']));
  const errosServidor: string[] = resultado && !resultado.aceito ? resultado.camposComErro : [];
  const erroDe = (k: string) => (tentou ? errosLocais[k] : undefined) ?? (errosServidor.includes(k) ? 'Verifique este campo (retorno da simulação).' : undefined);

  const campo = (k: string, rotulo: string, pos: string, input: ReactNode, ajuda?: string) => {
    const erro = erroDe(k);
    return (
      <label key={k} className={erro ? 'com-erro' : ''}>
        <span className="rotulo">{rotulo}{OBRIGATORIOS.includes(k) && <span className="obrig" aria-label="obrigatório"> *</span>}<small className="pos">pos. {pos}</small></span>
        {input}
        {erro ? <span className="erro-campo" role="alert">{erro}</span> : ajuda ? <span className="ajuda">{ajuda}</span> : null}
      </label>
    );
  };
  const texto = (k: string, rotulo: string, pos: string, max: number, ajuda?: string, extra: Record<string, unknown> = {}) =>
    campo(k, rotulo, pos, <input value={form[k]} maxLength={max} onChange={(e) => set(k, e.target.value)} {...extra} />, ajuda);
  const municipios = (k: string) => (
    <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value, ...(k === 'enderecoMunicipio' ? { enderecoUf: catalogos.municipios[e.target.value]?.uf ?? form.enderecoUf } : {}) })}>
      <option value="">Selecione…</option>
      {Object.entries(catalogos.municipios).map(([c, m]: any) => <option key={c} value={c}>{c} – {m.nome}/{m.uf}</option>)}
    </select>
  );
  const ufs = (k: string) => (
    <select value={form[k]} onChange={(e) => set(k, e.target.value)}>
      {catalogos.ufs.map((u: string) => <option key={u}>{u}</option>)}
    </select>
  );

  const grupos: [string, ReactNode[]][] = [
    ['Formulário', [
      texto('numeroFormularioRenach', 'Número-Formulário-RENACH', '038–048', 11, `UF de origem (${catalogos.ufOrigem}) + 9 dígitos, inexistente na base (003). Não use HAB-...`,
        { onChange: (e: any) => set('numeroFormularioRenach', e.target.value.toUpperCase()), placeholder: `${catalogos.ufOrigem}000000000` }),
      campo('dataCadastramento', 'Data-Cadastramento', '379–386', <input type="date" value={form.dataCadastramento} onChange={(e) => set('dataCadastramento', e.target.value)} />,
        'Não pode ser maior que a data da transação (810). A 155 precisa sair em até 1 ano e 60 dias (763).'),
    ]],
    ['Identificação', [
      texto('nomeCandidatoCivil', 'Nome-Candidato-Civil', '049–092', 44, 'Nome de registro civil, sem abreviações (805).'),
      campo('dataNascimento', 'Data-Nascimento', '093–100', <input type="date" value={form.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} />, 'Mínimo de 18 anos (311).'),
      campo('sexo', 'Sexo', '101', (
        <select value={form.sexo} onChange={(e) => set('sexo', e.target.value)}>
          <option value="">Selecione…</option><option value="1">1 – Masculino</option><option value="2">2 – Feminino</option>
        </select>
      )),
      campo('nacionalidade', 'Nacionalidade', '378', (
        <select value={form.nacionalidade} onChange={(e) => set('nacionalidade', e.target.value)}>
          {Object.entries(catalogos.nacionalidades).map(([c, n]: any) => <option key={c} value={c}>{c} – {n}</option>)}
        </select>
      ), '3 – Estrangeiro está fora do escopo da POC.'),
      campo('localidadeNascimento', 'Localidade-Nascimento', '229–233', municipios('localidadeNascimento'), 'Municípios da massa demonstrativa.'),
      campo('cpf', 'CPF', '218–228', <input value={form.cpf} inputMode="numeric" maxLength={14} onChange={(e) => set('cpf', e.target.value.replace(/\D/g, ''))} />,
        'Não pode pertencer a outro candidato ou condutor (761).'),
    ]],
    ['Documento de identidade', [
      campo('docTipo', 'Tipo', '190', (
        <select value={form.docTipo} onChange={(e) => set('docTipo', e.target.value)}>
          {Object.entries(catalogos.tiposDocumentoIdentidade).map(([c, n]: any) => <option key={c} value={c}>{c} – {n}</option>)}
        </select>
      )),
      texto('docNumero', 'Número-Identidade', '191–205', 15),
      texto('docOrgao', 'Órgão-Emissor', '206–215', 10),
      campo('docUf', 'UF do documento', '216–217', ufs('docUf')),
    ]],
    ['Filiação', [
      texto('nomeMae', 'Nome-Mãe', '102–145', 44, 'Em branco retorna 300 (exigiria confirmação).'),
      texto('nomePai', 'Nome-Pai', '146–189', 44, 'Opcional.'),
      texto('filiacaoAfetiva1', 'Filiação-Afetiva-1', '572–615', 44, 'Opcional.'),
      texto('filiacaoAfetiva2', 'Filiação-Afetiva-2', '616–659', 44, 'Opcional.'),
      texto('nomeSocial', 'Nome-Social', '528–571', 44, 'Opcional. Se informado, é o nome impresso na CNH.'),
    ]],
    ['Endereço', [
      texto('enderecoLogradouro', 'Endereço-Logradouro', '234–283', 50),
      texto('enderecoNumero', 'Endereço-Número', '284–293', 10),
      texto('enderecoComplemento', 'Endereço-Complemento', '294–323', 30),
      texto('enderecoBairro', 'Endereço-Bairro', '324–353', 30),
      campo('enderecoCep', 'Endereço-CEP', '354–361', <input value={form.enderecoCep} inputMode="numeric" maxLength={9} onChange={(e) => set('enderecoCep', e.target.value.replace(/\D/g, ''))} />),
      campo('enderecoMunicipio', 'Endereço-Município', '362–366', municipios('enderecoMunicipio')),
      campo('enderecoUf', 'Endereço-UF', '367–368', ufs('enderecoUf'), `Igual à UF de origem (${catalogos.ufOrigem}).`),
    ]],
    ['Contato (opcional)', [
      campo('ddd', 'DDD', '457–458', <input value={form.ddd} inputMode="numeric" maxLength={2} onChange={(e) => set('ddd', e.target.value.replace(/\D/g, ''))} />),
      campo('telefoneCelular', 'Telefone-Celular', '459–467', <input value={form.telefoneCelular} inputMode="numeric" maxLength={9} placeholder="9 dígitos (fictício)" onChange={(e) => set('telefoneCelular', e.target.value.replace(/\D/g, ''))} />),
      campo('email', 'E-mail', '468–527', <input type="email" value={form.email} maxLength={60} placeholder="exemplo@exemplo.invalid" onChange={(e) => set('email', e.target.value)} />),
    ]],
  ];

  function tentarEnviar() {
    setTentou(true);
    if (Object.keys(errosLocais).length === 0) setConfirmar(true);
  }

  return (
    <section aria-labelledby="t151">
      <header className="pagina-topo">
        <div>
          <p className="trilha">RENACH › Candidato › TR 151 – Cadastrar Candidato</p>
          <h2 id="t151">Cadastro do candidato</h2>
        </div>
      </header>
      <p className="nota">
        Leiaute do Manual RENACH v8.2 <FonteSelo fonte="MANUAL" />. O candidato é identificado pelo Número-Formulário-RENACH até a emissão:
        o Número-Registro só é gerado pela gráfica (TR 171), fora desta POC.
      </p>

      <div className="atalhos">
        <span className="muted">Massa fictícia:</span>
        {candidatos.map((c) => (
          <button key={c.chave} type="button" className="btn btn-pequeno" title={c.cenario} onClick={() => onContinuar(c.chave)}>
            Continuar {c.nome.split(' ')[0]} · {c.chave} · {c.cenario}
          </button>
        ))}
        <button type="button" className="btn btn-pequeno btn-fantasma" onClick={() => { setTentou(false); setForm({ ...FICTICIO, dataCadastramento: form.dataCadastramento }); }}>
          Preencher com candidato fictício
        </button>
      </div>

      <form className="form-grupos" onSubmit={(e) => { e.preventDefault(); tentarEnviar(); }} noValidate>
        {grupos.map(([g, itens]) => (
          <fieldset key={g} className="painel">
            <legend>{g}</legend>
            <div className="grade-campos">{itens}</div>
          </fieldset>
        ))}
        <div className="acoes-pagina barra-fixa">
          <button type="button" className="btn" onClick={() => { setTentou(false); setForm(form151Inicial()); }}>Limpar formulário</button>
          <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Processando…' : 'Cadastrar candidato (simulação)'}</button>
        </div>
      </form>

      {resultado && (
        <div className={`painel resultado ${resultado.aceito ? 'resultado-ok' : 'resultado-erro'}`} role="status">
          <h3>{resultado.aceito ? 'Aceito na simulação' : 'Rejeitado na simulação'}</h3>
          <p><Retorno retorno={resultado.retorno} /></p>
          {resultado.aceito ? (
            <>
              <p>Candidato incluído com Situação-CNH <strong>0 – Inexistente</strong>, formulário {resultado.prontuario.formularioRenachEmAndamento}.
                Próximo passo: registrar exames e cursos pela TR 181 com Tipo-Chave 1.</p>
              <div className="acoes">
                <button className="btn" onClick={() => onIr('consulta')}>Conferir na Consulta 575</button>
                <button className="btn btn-primario" onClick={() => onIr('eventos')}>Seguir para Eventos (TR 181) →</button>
              </div>
            </>
          ) : <p>Nenhum candidato foi incluído. Campos relacionados estão destacados.</p>}
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

      <Confirmacao aberto={confirmar} titulo="Cadastrar candidato (simulação)?" rotuloConfirmar="Cadastrar candidato (simulação)"
        onCancelar={() => setConfirmar(false)} onConfirmar={() => { setConfirmar(false); onEnviar(); }}>
        <ul className="resumo-confirmacao">
          <li>Candidato: <strong>{form.nomeCandidatoCivil.toUpperCase()}</strong></li>
          <li>Formulário RENACH: {form.numeroFormularioRenach} · CPF {mascaraCpf(form.cpf)}</li>
          <li>Nascimento {br(form.dataNascimento)} · cadastramento {br(form.dataCadastramento)}</li>
        </ul>
      </Confirmacao>
    </section>
  );
}
