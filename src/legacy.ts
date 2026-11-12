/**
 * لينكات النسخة القديمة (اللي كانت بتحط الجلسة في اللينك لأن n8n ما كانش بيسمح بـ localStorage):
 *   #s=<token>&r=r|a    ساكن أو أمين صندوق
 *   #guard&t=<token>    الأمن
 *   #nrg&t=<token>      NRG
 * بناخد الجلسة مرة واحدة ونحفظها في localStorage ونشيلها من اللينك. كده اللي ضاف التطبيق القديم
 * على شاشته ما يخرجش. لو الجلسة خلصت، الـ API بيرد SESSION والتطبيق بيرجّع لشاشة الدخول عادي.
 *
 * لازم الملف ده يتنفّذ قبل store.ts (عشان الـ store بيقرا الجلسة أول ما يتحمّل).
 */
import type { Role, Session } from './session';
import { readJSON, writeJSON } from './lib/storage';

export interface LegacyLink {
  role: Role;
  token: string;
  hash: string;
}

export function parseLegacyHash(hash: string): LegacyLink | null {
  const h = hash.replace(/^#\/?/, '');
  const params = new URLSearchParams(h.replace(/^(guard|nrg)&/, ''));
  const s = /^s=/.test(h) ? params.get('s') : null;
  if (s) {
    const role: Role = params.get('r') === 'a' ? 'admin' : 'resident';
    return { role, token: s, hash: role === 'admin' ? '#a/home' : '#r/home' };
  }
  const m = /^(guard|nrg)&/.exec(h);
  const t = m ? params.get('t') : null;
  if (m && t) return { role: m[1] as Role, token: t, hash: `#${m[1]}` };
  return null;
}

/** بصمة قصيرة للتوكن (عشان نعرف إنه اتاخد قبل كده من غير ما نخزّنه تاني) */
function mark(token: string): string {
  let h = 5381;
  for (let i = 0; i < token.length; i++) h = ((h << 5) + h + token.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function importLegacySession(): void {
  if (typeof location === 'undefined') return;
  const link = parseLegacyHash(location.hash);
  if (!link) return;
  const used = readJSON<string[]>('legacy.used') ?? [];
  const current = readJSON<Session>('session');
  const m = mark(link.token);
  // مرة واحدة بس: لو فيه جلسة شغالة أو اللينك ده اتاخد قبل كده (مثلاً المستخدم خرج بنفسه) ما نرجّعهاش
  if (!current && !used.includes(m)) {
    writeJSON('session', { role: link.role, token: link.token, at: Date.now() } satisfies Session);
    writeJSON('legacy.used', [...used, m].slice(-20));
  }
  // التوكن ما يفضلش في اللينك ولا في الـ history
  try {
    history.replaceState(history.state, '', `${location.pathname}${location.search}${link.hash}`);
  } catch {
    location.hash = link.hash;
  }
}

importLegacySession();
