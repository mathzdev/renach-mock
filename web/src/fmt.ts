export function br(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
/** Máscara de CPF para a interface operacional: ***.000.001-** */
export function mascaraCpf(cpf?: string): string {
  const d = (cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11) return '—';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
export function mascaraCnpj(c?: string): string {
  const d = (c ?? '').replace(/\D/g, '');
  if (d.length !== 14) return '—';
  return `**.***.${d.slice(5, 8)}/${d.slice(8, 12)}-**`;
}
/** Máscara genérica: mantém só os 3 últimos caracteres. */
export function mascaraDoc(v?: string): string {
  if (!v) return '—';
  return '•'.repeat(Math.max(0, v.length - 3)) + v.slice(-3);
}
export function mascaraCep(c?: string): string {
  const d = (c ?? '').replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 2)}***-***` : '—';
}
export const ROTULO_STATUS: Record<string, string> = {
  ATENDIDO: 'Atendido',
  NAO_ATENDIDO: 'Não atendido',
  NAO_VERIFICAVEL: 'Não verificável',
  NAO_APLICAVEL: 'Não aplicável',
};
export const ROTULO_FONTE: Record<string, string> = {
  MANUAL: 'Manual RENACH v8.2',
  FIXTURE: 'Fixture fictícia',
  INTERPRETACAO_POC: 'Interpretação da POC',
  LACUNA: 'Lacuna / não verificável',
};

export const SITUACAO_TOM: Record<string, string> = { '1': 'ok', '4': 'neutro', '6': 'aviso', '0': 'aviso', '2': 'info', '3': 'info', '5': 'neutro' };
