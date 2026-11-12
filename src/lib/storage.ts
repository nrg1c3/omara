/**
 * localStorage آمن: ممكن يرمي exception (وضع خاص، أو تخزين مقفول)،
 * فالتطبيق لازم يكمّل من غيره.
 */
const PREFIX = 'omara.';

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* التخزين مش متاح أو مليان: نكمّل من غيره */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** يمسح كل مفاتيح التطبيق اللي بتبدأ بـ prefix معيّن (مثلاً عند الخروج). */
export function removeByPrefix(prefix: string): void {
  try {
    const full = PREFIX + prefix;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(full)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
