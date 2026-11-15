/** Utilitários de data em ISO (yyyy-mm-dd), sem fuso horário. */

export function hojeIso(): string {
  const fixo = process.env.DEMO_HOJE;
  if (fixo && /^\d{4}-\d{2}-\d{2}$/.test(fixo)) return fixo;
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dataValida(iso: string | undefined): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function somarAnos(iso: string, anos: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y + anos, m - 1, d));
  // 29/02 em ano não bissexto vira 01/03; aceitável para a demonstração
  return dt.toISOString().slice(0, 10);
}

export function idadeEm(nascimento: string, referencia: string): number {
  const [ny, nm, nd] = nascimento.split('-').map(Number);
  const [ry, rm, rd] = referencia.split('-').map(Number);
  let idade = ry - ny;
  if (rm < nm || (rm === nm && rd < nd)) idade -= 1;
  return idade;
}

export function br(iso: string | undefined | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function somarMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + meses, d)).toISOString().slice(0, 10);
}
