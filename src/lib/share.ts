/** نسخ نص للحافظة (مع طريقة قديمة للموبايلات الرخيصة) */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* نجرب الطريقة القديمة */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** لينك واتساب: لرقم معيّن، أو من غير رقم (المستخدم يختار جهة الاتصال) */
export function waLink(text: string, phone?: string): string {
  const p = (phone || '').replace(/\D/g, '');
  const intl = p.startsWith('0') ? `2${p}` : p; // 010... ← 2010...
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export async function shareText(text: string, title = 'عمارتنا'): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'failed';
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}
