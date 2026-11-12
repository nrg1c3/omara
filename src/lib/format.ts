const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** 18450 ← "18,450" (أرقام إنجليزي بفواصل الآلاف) */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return nf.format(Number(n));
}

/** "18,450 ج.م" */
export function formatMoney(n: number | null | undefined): string {
  return `${formatNumber(n)} ج.م`;
}

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** "2026-11" ← "نوفمبر 2026" */
export function formatMonth(ym: string | undefined): string {
  if (!ym) return '';
  const m = /^(\d{4})-(\d{2})/.exec(ym);
  if (!m) return ym;
  const idx = Number(m[2]) - 1;
  return AR_MONTHS[idx] ? `${AR_MONTHS[idx]} ${m[1]}` : ym;
}

/** الشهر الحالي YYYY-MM بتوقيت الجهاز */
export function currentMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** النهارده YYYY-MM-DD بتوقيت الجهاز */
export function today(d = new Date()): string {
  return `${currentMonth(d)}-${String(d.getDate()).padStart(2, '0')}`;
}
