/**
 * Cliente HTTP da API demonstrativa (NestJS, mesma máquina).
 * Um identificador de sessão novo é criado a cada carregamento da página:
 * recarregar = voltar ao estado inicial, como pede a especificação.
 * Nenhuma chamada é feita para fora de /api local.
 */
function gerarSessao(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
export const SESSAO = gerarSessao();

export class ErroApi extends Error {
  constructor(public status: number, public corpo: any) {
    super(corpo?.mensagem ?? corpo?.message?.mensagem ?? `Erro ${status}`);
  }
}

async function chamar<T>(metodo: 'GET' | 'POST', url: string, corpo?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'X-Demo-Session': SESSAO },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroApi(r.status, json);
  return json as T;
}

export const api = {
  catalogos: () => chamar<any>('GET', '/api/catalogos'),
  demonstrativos: () => chamar<any[]>('GET', '/api/demo/prontuarios'),
  reiniciar: () => chamar<any>('POST', '/api/demo/reiniciar'),
  consultar575: (tipoChave: string, numero: string) =>
    chamar<any>('GET', `/api/renach/575?tipoChave=${encodeURIComponent(tipoChave)}&numero=${encodeURIComponent(numero)}`),
  registrar181: (payload: Record<string, unknown>) => chamar<any>('POST', '/api/renach/181', payload),
  prevalidar159: (payload: Record<string, unknown>) => chamar<any>('POST', '/api/renach/159/prevalidar', payload),
  autorizar159: (payload: Record<string, unknown>) => chamar<any>('POST', '/api/renach/159', payload),
  cadastrar151: (payload: Record<string, unknown>) => chamar<any>('POST', '/api/renach/151', payload),
  prevalidar155: (payload: Record<string, unknown>) => chamar<any>('POST', '/api/renach/155/prevalidar', payload),
  habilitar155: (payload: Record<string, unknown>) => chamar<any>('POST', '/api/renach/155', payload),
};
