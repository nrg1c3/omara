import { onlyDigits, parseAmount } from './digits';

export const req = (v: string, msg: string): string | null => (v && v.trim() ? null : msg);

export function amountError(v: string, { allowNegative = false } = {}): string | null {
  if (!v.trim()) return 'اكتب المبلغ بالجنيه.';
  const neg = allowNegative && v.trim().startsWith('-');
  const n = parseAmount(neg ? v.trim().slice(1) : v);
  if (n === null) return 'المبلغ لازم يكون رقم، زي 350.';
  if (n === 0) return 'المبلغ ما ينفعش يبقى صفر.';
  return null;
}

export function amountValue(v: string): number {
  const t = v.trim();
  const neg = t.startsWith('-');
  const n = parseAmount(neg ? t.slice(1) : t) ?? 0;
  return neg ? -n : n;
}

export function phoneError(v: string, required = true): string | null {
  const d = onlyDigits(v);
  if (!d) return required ? 'اكتب رقم الموبايل.' : null;
  if (!/^01\d{9}$/.test(d)) return 'رقم الموبايل 11 رقم ويبدأ بـ 01.';
  return null;
}

export function emailError(v: string, required = false): string | null {
  if (!v.trim()) return required ? 'اكتب الإيميل.' : null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'الإيميل مكتوب غلط، زي name@gmail.com.';
}

/** يرجّع أول غلط عشان نوقف الإرسال */
export function hasErrors(e: Record<string, string | null | undefined>): boolean {
  return Object.values(e).some(Boolean);
}
