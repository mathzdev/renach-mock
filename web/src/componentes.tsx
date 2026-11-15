import { ReactNode, useEffect, useRef } from 'react';
import { ROTULO_FONTE, ROTULO_STATUS } from './fmt';

export function Selo({ tipo, children }: { tipo: string; children: ReactNode }) {
  return <span className={`selo selo-${tipo}`}>{children}</span>;
}

export function StatusSelo({ status }: { status: string }) {
  const tipo = { ATENDIDO: 'ok', NAO_ATENDIDO: 'erro', NAO_VERIFICAVEL: 'aviso', NAO_APLICAVEL: 'neutro' }[status] ?? 'neutro';
  return <Selo tipo={tipo}>{ROTULO_STATUS[status] ?? status}</Selo>;
}

export function FonteSelo({ fonte }: { fonte: string }) {
  return <span className={`fonte fonte-${fonte}`}>{ROTULO_FONTE[fonte] ?? fonte}</span>;
}

export function Retorno({ retorno }: { retorno?: { codigo: string; mensagem: string; origemCodigo: string } }) {
  if (!retorno) return null;
  return (
    <span className="retorno">
      <code>{retorno.codigo}</code> {retorno.mensagem}
      <small className="muted">
        {retorno.origemCodigo === 'POC_LOCAL' ? ' · código local da POC (sem código no Manual)' : ' · Manual RENACH v8.2'}
      </small>
    </span>
  );
}

export function Secao({ titulo, children, aberta = true, extra }: { titulo: string; children: ReactNode; aberta?: boolean; extra?: ReactNode }) {
  return (
    <details className="secao" open={aberta}>
      <summary>
        <span>{titulo}</span>
        {extra}
      </summary>
      <div className="secao-corpo">{children}</div>
    </details>
  );
}

export function Campos({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="campos">
      {itens.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v === undefined || v === null || v === '' ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabela({ colunas, linhas, vazio }: { colunas: string[]; linhas: ReactNode[][]; vazio: string }) {
  if (!linhas.length) return <p className="muted">{vazio}</p>;
  return (
    <div className="tabela-rolagem">
      <table>
        <thead>
          <tr>{colunas.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>{l.map((c, j) => <td key={j} data-rotulo={colunas[j]}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Card({ titulo, valor, detalhe, tom = 'neutro' }: { titulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: string }) {
  return (
    <div className={`card card-${tom}`}>
      <div className="card-titulo">{titulo}</div>
      <div className="card-valor">{valor}</div>
      {detalhe && <div className="card-detalhe">{detalhe}</div>}
    </div>
  );
}

export function Confirmacao({
  aberto, titulo, children, rotuloConfirmar, onConfirmar, onCancelar,
}: {
  aberto: boolean; titulo: string; children: ReactNode; rotuloConfirmar: string; onConfirmar: () => void; onCancelar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog ref={ref} className="dialogo" onCancel={(e) => { e.preventDefault(); onCancelar(); }}>
      <h3>{titulo}</h3>
      <div className="dialogo-corpo">{children}</div>
      <p className="aviso-sim">Simulação local com dados fictícios. Nada será transmitido.</p>
      <div className="acoes">
        <button className="btn" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primario" onClick={onConfirmar} autoFocus>{rotuloConfirmar}</button>
      </div>
    </dialog>
  );
}

/** Área recolhível do diagnóstico técnico, separando as quatro naturezas de dado. */
export function Diagnostico({ diag, titulo }: { diag: any; titulo?: string }) {
  if (!diag) return null;
  const validacoes: any[] = diag.validacoes ?? [];
  const grupos: Record<string, any[]> = { MANUAL: [], FIXTURE: [], INTERPRETACAO_POC: [], LACUNA: [] };
  validacoes.forEach((v) => (grupos[v.fonte] ??= []).push(v));
  return (
    <details className="diagnostico">
      <summary>{titulo ?? `Diagnóstico técnico — TR ${diag.transacao?.codigo}`}</summary>
      <div className="diag-corpo">
        <p className="faixa-alerta">{diag.transmissao}</p>
        <Campos
          itens={[
            ['Transação', `${diag.transacao?.codigo} — ${diag.transacao?.nome}`],
            ['Origem → destino', diag.origemDestino],
            ['Chave', diag.chave ? `${diag.chave.tipo}: ${diag.chave.valor}` : '—'],
            ['Número', diag.numero ? `${diag.numero.tipo}: ${diag.numero.valor || '—'}` : '—'],
            ['Condicionalidade', diag.condicionalidade ?? 'Ver leiaute'],
            ['Retorno', <Retorno retorno={diag.retorno} />],
            ['Mutação de estado', diag.mutacao ?? 'Nenhuma (consulta)'],
          ]}
        />
        {validacoes.length > 0 && (
          <>
            <h4>Validações executadas, por natureza da informação</h4>
            {Object.entries(grupos).map(([fonte, lista]) =>
              lista.length ? (
                <div key={fonte} className="diag-grupo">
                  <FonteSelo fonte={fonte} />
                  <ul>
                    {lista.map((v) => (
                      <li key={v.id}>
                        <strong>{v.id}</strong> {v.titulo} — <StatusSelo status={v.status} /> <span className="muted">{v.detalhe}</span>
                        {v.referencia && <small className="ref"> [{v.referencia}]</small>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </>
        )}
        {diag.interpretacoes && (
          <>
            <h4><FonteSelo fonte="INTERPRETACAO_POC" /> Interpretações adotadas (não são regra oficial)</h4>
            <ul>{diag.interpretacoes.map((t: string) => <li key={t}>{t}</li>)}</ul>
          </>
        )}
        {diag.lacunas && (
          <>
            <h4><FonteSelo fonte="LACUNA" /> Lacunas documentais</h4>
            <ul>{diag.lacunas.map((t: string) => <li key={t}>{t}</li>)}</ul>
          </>
        )}
        {diag.observacao && <p className="nota">{diag.observacao}</p>}
        {diag.leiaute && (
          <>
            <h4><FonteSelo fonte="MANUAL" /> Leiaute de envio (posições do Manual)</h4>
            <Tabela
              colunas={['Posição', '#', 'Elemento de dados', 'Tam.', 'Formato', 'Obrigatoriedade']}
              linhas={diag.leiaute.map((c: any) => [
                c.posicao, c.seq ?? '—', c.nomeManual, c.tamanho, c.formatoManual,
                c.obrigatoriedade === 'CONDICIONAL' ? `Condicional: ${c.condicao}` : c.obrigatoriedade.toLowerCase(),
              ])}
              vazio=""
            />
          </>
        )}
        {diag.leiauteEnvio && (
          <>
            <h4><FonteSelo fonte="MANUAL" /> Leiaute de envio (posições do Manual)</h4>
            <Tabela
              colunas={['Posição', 'Elemento de dados', 'Tam.', 'Formato', 'Obrig.', 'Valor no payload']}
              linhas={diag.leiauteEnvio.map((c: any) => [
                c.posicao, c.elemento, c.tamanho, c.formato, c.obrigatorio ? 'Sim' : 'Não',
                c.chave ? <code>{String(diag.payload?.[c.chave] ?? '') || '—'}</code> : <span className="muted">—</span>,
              ])}
              vazio=""
            />
          </>
        )}
        {(diag.estadoAnterior || diag.estadoPosterior) && (
          <div className="grade-2">
            <div><h4>Estado anterior</h4><pre>{JSON.stringify(diag.estadoAnterior, null, 2)}</pre></div>
            <div><h4>Estado posterior</h4><pre>{JSON.stringify(diag.estadoPosterior, null, 2)}</pre></div>
          </div>
        )}
        {diag.payload && (
          <>
            <h4><FonteSelo fonte="FIXTURE" /> Payload demonstrativo (valores completos, fictícios)</h4>
            <pre>{JSON.stringify(diag.payload, null, 2)}</pre>
          </>
        )}
      </div>
    </details>
  );
}
