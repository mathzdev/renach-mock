import { FormEvent, useState } from 'react';
import { Campos, Card, Diagnostico, Retorno, Secao, Selo, Tabela } from './componentes';
import { br, mascaraCep, mascaraCnpj, mascaraCpf, mascaraDoc } from './fmt';

interface Props {
  catalogos: any;
  demonstrativos: any[];
  resultado: any;
  carregando: boolean;
  onConsultar: (tipoChave: string, numero: string) => void;
  onIr: (etapa: 'exame' | 'autorizacao') => void;
}

const TIPOS = [
  { v: '2', r: '2 – Número-Registro', ph: '11 dígitos' },
  { v: '7', r: '7 – CPF', ph: '000.000.000-00' },
  { v: '1', r: '1 – Número-Formulário-RENACH (só candidato)', ph: 'UF + 9 dígitos' },
];

export function Consulta575({ catalogos, demonstrativos, resultado, carregando, onConsultar, onIr }: Props) {
  const [tipo, setTipo] = useState(resultado?.consulta?.tipoChave ?? '2');
  const [numero, setNumero] = useState(resultado?.consulta?.numero ?? '');
  const [erro, setErro] = useState('');

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!numero.trim()) return setErro('Informe o número da chave.');
    setErro('');
    onConsultar(tipo, numero);
  }
  const consultar = (t: string, n: string) => { setTipo(t); setNumero(n); onConsultar(t, n); };

  const p = resultado?.prontuario;
  const dc = p?.dadosControle;
  const d = p?.dadosCadastrais;
  const ex03 = p?.exames.find((e: any) => e.codigoExame === '03');
  const ultimaEmissao = p?.emissoes.filter((e: any) => !e.cancelada).slice(-1)[0];
  const ex03Novo = ex03 && ultimaEmissao && ex03.dataExame > ultimaEmissao.dataEmissao;
  const sit = (c: string) => `${c} – ${catalogos.situacoesCnh[c] ?? '?'}`;
  const ent = (cnpj?: string | null) => catalogos.entidades.find((x: any) => x.cnpj === cnpj)?.nome ?? (cnpj ? mascaraCnpj(cnpj) : '—');

  return (
    <section aria-labelledby="t575">
      <header className="pagina-topo">
        <div>
          <p className="trilha">RENACH › Consulta › TR 575 – Consulta Prontuário</p>
          <h2 id="t575">Consulta do prontuário</h2>
        </div>
      </header>

      <form className="painel form-linha" onSubmit={enviar} noValidate>
        <label>
          Tipo-Chave
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.r}</option>)}
          </select>
        </label>
        <label className="cresce">
          Número
          <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={TIPOS.find((t) => t.v === tipo)?.ph}
            aria-invalid={!!erro} aria-describedby="erro-chave ajuda-chave" />
          {erro && <span id="erro-chave" className="erro-campo">{erro}</span>}
          <span id="ajuda-chave" className="ajuda">O processo estadual (HAB-...) não é chave RENACH.</span>
        </label>
        <button className="btn btn-primario" disabled={carregando}>{carregando ? 'Consultando…' : 'Consultar prontuário'}</button>
      </form>

      <div className="atalhos">
        <span className="muted">Massa fictícia:</span>
        {demonstrativos.map((x) => (
          <button key={x.numeroRegistro} type="button" className="btn btn-pequeno" title={x.cenario}
            onClick={() => consultar('2', x.numeroRegistro)}>
            {x.nome.split(' ')[0]} · {x.numeroRegistro} · {x.cenario}
          </button>
        ))}
        <button type="button" className="btn btn-pequeno btn-fantasma" onClick={() => consultar('2', 'HAB-2026-118342')}>
          Testar com HAB-2026-118342
        </button>
      </div>

      {resultado && (
        <div className="painel consulta-id">
          <Campos itens={[
            ['Chave utilizada', `Tipo-Chave ${resultado.consulta.descricaoTipoChave}: ${resultado.consulta.tipoChave === '7' ? mascaraCpf(resultado.consulta.numero) : resultado.consulta.numero}`],
            ['Resultado', <Selo tipo={resultado.consulta.resultado === 'LOCALIZADO' ? 'ok' : 'erro'}>{resultado.consulta.resultado}</Selo>],
            ['Código-Retorno-Execução', <Retorno retorno={resultado.consulta.retorno} />],
          ]} />
          {resultado.diagnostico?.observacao && <p className="nota">{resultado.diagnostico.observacao}</p>}
        </div>
      )}

      {p && (
        <>
          <div className="cards">
            <Card titulo="Situação-CNH" tom={dc.situacaoCnh === '1' ? 'ok' : dc.situacaoCnh === '6' ? 'aviso' : 'neutro'}
              valor={sit(dc.situacaoCnh)} detalhe={`Anterior: ${sit(dc.situacaoCnhAnterior)}`} />
            <Card titulo="Data-Validade-CNH" tom={dc.dataValidadeCnh < new Date().toISOString().slice(0, 10) ? 'aviso' : 'ok'}
              valor={br(dc.dataValidadeCnh)} detalhe={`Última emissão: ${br(dc.dataUltimaEmissaoHistorico)}`} />
            <Card titulo="Exame 03 – Aptidão Física e Mental" tom={ex03Novo ? 'ok' : 'aviso'}
              valor={ex03 ? `${br(ex03.dataExame)} · ${ex03.descricaoResultado}` : 'Nenhum'}
              detalhe={ex03Novo ? `Válido até ${br(ex03.dataValidade)} · posterior à última emissão` : 'Anterior à última emissão — registre novo exame (TR 181)'} />
            <Card titulo="Último motivo / transação" valor={`${dc.motivoRequerimento ?? '—'} · TR ${dc.codigoTransacaoUltimaAtualizacao}`}
              detalhe={p.descricoes.motivoRequerimento ?? ''} />
          </div>

          <div className="acoes-pagina">
            <button className="btn" onClick={() => onIr('exame')}>Ir para Registrar exame (TR 181) →</button>
            <button className="btn" onClick={() => onIr('autorizacao')}>Ir para Autorizar emissão (TR 159) →</button>
          </div>

          <div className="grade-secoes">
            <Secao titulo="Identificação">
              <Campos itens={[
                ['Nome-Condutor-Civil', d.nomeCondutorCivil],
                ['Número-Registro', p.numeroRegistro],
                ['CPF', mascaraCpf(d.cpf)],
                ['Documento-Identidade', mascaraDoc(d.documentoIdentidade)],
                ['Data-Nascimento', br(d.dataNascimento)],
                ['Sexo', d.sexo === '1' ? '1 – Masculino' : '2 – Feminino'],
                ['Nome-Mãe', d.nomeMae],
                ['Nome-Pai', d.nomePai],
                ['Nacionalidade', d.nacionalidade === '1' ? '1 – Brasileira' : d.nacionalidade],
                ['Localidade-Nascimento', `${d.localidadeNascimento} – ${d.localidadeNascimentoDescricao}`],
              ]} />
            </Secao>
            <Secao titulo="Dados Cadastrais">
              <Campos itens={[
                ['Endereço', `${d.enderecoLogradouro}, ${d.enderecoNumero}${d.enderecoComplemento ? ' — ' + d.enderecoComplemento : ''}`],
                ['Bairro', d.enderecoBairro],
                ['Município/UF', `${d.enderecoMunicipio} – ${d.enderecoMunicipioDescricao}/${d.enderecoUf}`],
                ['CEP', mascaraCep(d.enderecoCep)],
                ['Data-Cadastramento', br(d.dataCadastramento)],
                ['Primeira-Habilitação', br(d.primeiraHabilitacao)],
                ['UF-Domínio', d.ufDominio],
                ['Celular', d.telefoneCelular ? `(${d.ddd}) •••••${d.telefoneCelular.slice(-4)}` : '—'],
              ]} />
            </Secao>
            <Secao titulo="Dados de Controle">
              <Campos itens={[
                ['Situação-CNH', sit(dc.situacaoCnh)],
                ['Situação-CNH-Anterior', sit(dc.situacaoCnhAnterior)],
                ['Motivo-Requerimento', dc.motivoRequerimento ? `${dc.motivoRequerimento} – ${p.descricoes.motivoRequerimento}` : '—'],
                ['Permissionário', { '1': '1 – Sim', '2': '2 – Não', '3': '3 – Nova Permissão' }[dc.permissionario as '1']],
                ['Código-Transação-Última-Atualização', dc.codigoTransacaoUltimaAtualizacao],
                ['Número-Formulário-RENACH', dc.numeroFormularioRenach],
                ['Número-Formulário-CNH', mascaraDoc(dc.numeroFormularioCnh)],
                ['Cancelamento', dc.cancelamento === '0' ? '0 – Sem cancelamento' : dc.cancelamento],
                ['Formulário da renovação (processo atual)', p.formularioRenachEmAndamento],
                ['Processo estadual (só referência)', p.processoEstadualReferencia ?? '—'],
              ]} />
            </Secao>
            <Secao titulo="CNH">
              <Campos itens={[
                ['Categoria-Atual', dc.categoriaAtual],
                ['Categoria-Autorizada', dc.categoriaAutorizada],
                ['Categoria-Rebaixada', dc.categoriaRebaixada],
                ['Data-Validade-CNH', br(dc.dataValidadeCnh)],
                ['Observação-CNH', dc.observacaoCnh.length ? dc.observacaoCnh.map((o: string) => o.trim()).join(', ') : '—'],
                ['Data-Última-Emissão-Histórico', br(dc.dataUltimaEmissaoHistorico)],
              ]} />
              <h4>Histórico de Emissões (HEMI)</h4>
              <Tabela
                colunas={['Emissão', 'Motivo', 'Categoria', 'Validade', 'Formulário RENACH', 'Cancelada']}
                linhas={p.emissoes.map((e: any) => [br(e.dataEmissao), `${e.motivoRequerimento} – ${catalogos.motivosRequerimento[e.motivoRequerimento]}`, e.categoria, br(e.dataValidade), e.numeroFormularioRenach, e.cancelada ? 'Sim' : 'Não'])}
                vazio="Sem emissões."
              />
              {p.autorizacoes.length > 0 && (
                <>
                  <h4>Autorizações simuladas (TR 159)</h4>
                  <Tabela colunas={['Id', 'Motivo', 'Categoria', 'Validade', 'Formulário']}
                    linhas={p.autorizacoes.map((a: any) => [a.id, '5 – Renovação de Exames', a.categoria, br(a.dataValidade), a.numeroFormularioRenach])} vazio="" />
                </>
              )}
            </Secao>
            <Secao titulo="Categorias">
              <Tabela colunas={['Categoria', 'Data-Início']}
                linhas={Object.entries(dc.datasInicioCategoria).map(([c, dt]) => [c, br(dt as string)])} vazio="Sem categorias." />
            </Secao>
            <Secao titulo="Exame Toxicológico">
              {p.toxicologico.dataColeta ? (
                <Campos itens={[
                  ['Data-Coleta-Tox.', br(p.toxicologico.dataColeta)],
                  ['Data-Validade-Tox. (90 dias)', br(p.toxicologico.dataValidade)],
                  ['Situação-Exame-Tox.', p.toxicologico.situacao === '1' ? '1 – OK' : '2 – Com pendência'],
                  ['CNPJ-Laboratório', ent(p.toxicologico.cnpjLaboratorio)],
                  ['Número-Laudo', mascaraDoc(p.toxicologico.numeroLaudo)],
                  ['Prazo-Realização-Toxicológico', br(p.toxicologico.prazoRealizacao)],
                ]} />
              ) : <p className="muted">Nenhuma coleta registrada.</p>}
            </Secao>
            <Secao titulo={`Eventos — Exames (${p.exames.length}) e Cursos (${p.cursos.length})`} extra={<span className="muted"> ordem cronológica</span>}>
              <Tabela
                colunas={['Data', 'Evento', 'Resultado', 'Validade', 'Obs.', 'Origem']}
                linhas={[
                  ...p.exames.map((e: any) => ({ data: e.dataExame, linha: [
                    br(e.dataExame), `E – Exame ${e.codigoExame} ${e.descricaoExame}`, `${e.resultado} – ${e.descricaoResultado}`,
                    br(e.dataValidade), e.observacoes.join(', '),
                    e.procedencia === 'SIMULACAO_TR181' ? <Selo tipo="info">Simulação TR 181</Selo> : 'Massa demonstrativa',
                  ] })),
                  ...p.cursos.map((c: any) => ({ data: c.dataFimCurso, linha: [
                    br(c.dataFimCurso), `C – Curso ${c.codigoCurso} ${c.descricaoCurso}`, '—', br(c.dataValidade), '—', 'Massa demonstrativa',
                  ] })),
                ].sort((a, b) => a.data.localeCompare(b.data)).map((x) => x.linha)}
                vazio="Sem eventos."
              />
              <details>
                <summary>Histórico de Comandos de Atualização (HICOM)</summary>
                <Tabela colunas={['Data', 'TR', 'Descrição']} linhas={p.hicom.map((h: any) => [br(h.data), h.transacao, h.descricao])} vazio="" />
              </details>
            </Secao>
            <Secao titulo="Bloqueios">
              <Tabela colunas={['UF', 'Motivo', 'Data', 'Documento', 'Penalidade']}
                linhas={p.bloqueios.map((b: any) => [b.ufDetranBloqueio, b.motivoBloqueio === '2' ? '2 – Suspensão' : b.motivoBloqueio, br(b.dataBloqueio), b.documentoGeradorBloqueio, `${br(b.dataInicioPenalidade)} a ${br(b.dataFimPenalidade)}`])}
                vazio="Nenhum bloqueio." />
            </Secao>
            <Secao titulo="Ocorrências">
              <Tabela colunas={['Data', 'Motivo', 'Descrição']} linhas={p.ocorrencias.map((o: any) => [br(o.dataOcorrencia), o.motivoOcorrencia, o.descricaoOcorrencia])} vazio="Nenhuma ocorrência." />
            </Secao>
          </div>
        </>
      )}
      {resultado && <Diagnostico diag={resultado.diagnostico} />}
    </section>
  );
}
