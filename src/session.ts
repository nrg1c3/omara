import type { ApiRole } from './api';
import { readJSON, remove, removeByPrefix, writeJSON } from './lib/storage';

export type Role = 'resident' | 'admin' | 'guard' | 'nrg';

export interface Session {
  role: Role;
  token: string;
  building_id?: string;
  /** وقت الدخول (ms) */
  at: number;
}

const KEY = 'session';

export function loadSession(): Session | null {
  const s = readJSON<Session>(KEY);
  if (!s || typeof s.token !== 'string' || !s.token) return null;
  if (!['resident', 'admin', 'guard', 'nrg'].includes(s.role)) return null;
  return s;
}

export function saveSession(s: Session): void {
  writeJSON(KEY, s);
}

/** خروج: الجلسة وآخر شاشات محفوظة والمسودات */
export function clearSession(): void {
  remove(KEY);
  removeByPrefix('view.');
  removeByPrefix('draft.');
}

export function apiRole(role: Role | undefined): ApiRole | null {
  if (role === 'resident') return 'r';
  if (role === 'admin') return 'a';
  return null;
}

/* ===== آخر شاشة اتحمّلت (للعرض offline والفتح السريع) ===== */

export interface Cached<T> {
  data: T;
  at: number;
}

export function loadCachedView<T>(name: string): Cached<T> | null {
  return readJSON<Cached<T>>(`view.${name}`);
}

export function saveCachedView(name: string, data: unknown): void {
  writeJSON(`view.${name}`, { data, at: Date.now() });
}
