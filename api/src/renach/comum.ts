import { Fonte, Retorno, Validacao } from '../domain/tipos';

export const AVISO_TRANSMISSAO = 'NENHUMA TRANSMISSÃO REALIZADA — processamento local, em memória, com dados fictícios.';
export const ORIGEM_DESTINO = 'DETRAN → BCA (Manual RENACH v8.2, quadro de transações). Na POC: navegador → API local.';
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Monta uma validação a partir de uma condição. */
export function regra(
  id: string, titulo: string, ok: boolean, detalheOk: string, detalheFalha: string,
  opts: { codigo?: Retorno; campos?: string[]; fonte?: Fonte; referencia?: string; impeditivo?: boolean } = {},
): Validacao {
  return {
    id,
    titulo,
    status: ok ? 'ATENDIDO' : 'NAO_ATENDIDO',
    impeditivo: opts.impeditivo ?? true,
    detalhe: ok ? detalheOk : detalheFalha,
    fonte: opts.fonte ?? 'MANUAL',
    referencia: opts.referencia,
    campos: opts.campos,
    codigoRetorno: ok ? undefined : opts.codigo,
  };
}

export const primeiraFalha = (v: Validacao[]) => v.find((x) => x.impeditivo && x.status === 'NAO_ATENDIDO');

