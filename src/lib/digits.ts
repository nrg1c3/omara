/** يحوّل الأرقام العربي (٠-٩) والفارسي (۰-۹) لأرقام إنجليزي. */
export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/** يسيب الأرقام بس (بعد تحويل العربي). */
export function onlyDigits(input: string): string {
  return normalizeDigits(input).replace(/\D+/g, '');
}

/** رقم عشري (مبلغ): أرقام ونقطة واحدة بس. "١٬٢٥٠٫٥" ← "1250.5" */
export function parseAmount(input: string): number | null {
  const s = normalizeDigits(input)
    .replace(/[٫]/g, '.') // الفاصلة العشرية العربي
    .replace(/[,٬\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
