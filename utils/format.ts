/** Formats a number as Philippine pesos, e.g. 1234.5 -> "₱1,234.50". */
export function peso(n: number): string {
  const v = Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
  const sign = v < 0 ? '-' : '';
  const [whole, dec] = Math.abs(v).toFixed(2).split('.');
  return `${sign}₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}

/** Parses user text like "1,200.50" to a number. Returns NaN when invalid. */
export function parseAmount(text: string): number {
  const cleaned = text.trim().replace(/,/g, '');
  if (cleaned === '' || !/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time day key "YYYY-MM-DD" used for grouping daily spending. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD HH:mm" in local time (used in the Excel export). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${dayKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function shortDay(d: Date): string {
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}
