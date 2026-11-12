import { useEffect, useState } from 'preact/hooks';
import { call, configureApi, type AdminView, type ResidentView, type XView, type YView } from './api';
import { replace } from './router';
import { apiRole, clearSession, loadCachedView, loadSession, saveCachedView, saveSession, type Session } from './session';

/** حالة التطبيق: الجلسة وآخر شاشة اتحمّلت. store صغير من غير مكتبات. */
export interface AppState {
  session: Session | null;
  resident: ResidentView | null;
  admin: AdminView | null;
  /** وقت آخر تحميل ناجح للشاشة (لو جاية من الكاش بيبان إنها قديمة) */
  loadedAt: number | null;
  /** رسالة تتعرض في شاشة الدخول (مثلاً "الجلسة خلصت") */
  loginNotice: string | null;
  /** omara-x: التصويت والزوار والصيانة */
  x: XView | null;
  /** omara-y: التقسيط والميزانية والأمن */
  y: YView | null;
}

function initialState(): AppState {
  const session = loadSession();
  const r = session?.role === 'resident' ? loadCachedView<ResidentView>('resident') : null;
  const a = session?.role === 'admin' ? loadCachedView<AdminView>('admin') : null;
  return {
    session,
    resident: r?.data ?? null,
    admin: a?.data ?? null,
    loadedAt: r?.at ?? a?.at ?? null,
    loginNotice: null,
    x: session ? loadCachedView<XView>('x')?.data ?? null : null,
    y: session ? loadCachedView<YView>('y')?.data ?? null : null
  };
}

let state: AppState = initialState();
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useAppState(): AppState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

/* ===== ربط عميل الـ API بالجلسة ===== */

export const SESSION_EXPIRED_MSG = 'الجلسة خلصت. ادخل تاني.';

export function expireSession(notice = SESSION_EXPIRED_MSG): void {
  clearSession();
  setState({ session: null, resident: null, admin: null, x: null, y: null, loadedAt: null, loginNotice: notice });
  replace({ name: 'login' });
}

configureApi({
  getToken: () => state.session?.token ?? null,
  getRole: () => apiRole(state.session?.role),
  onSessionExpired: () => expireSession()
});

/* ===== الدخول والخروج ===== */

function stripToken<T extends { token?: string }>(v: T): Omit<T, 'token'> {
  const { token: _t, ...rest } = v;
  return rest;
}

export async function loginResident(rawCode: string): Promise<void> {
  const res = await call('r_login', { code: rawCode });
  const session: Session = { role: 'resident', token: res.token, at: Date.now() };
  saveSession(session);
  const view = stripToken(res) as ResidentView;
  saveCachedView('resident', view);
  setState({ session, resident: view, admin: null, x: null, y: null, loadedAt: Date.now(), loginNotice: null });
}

export async function loginAdmin(buildingId: string, pin: string): Promise<void> {
  const res = await call('a_login', { building_id: buildingId, pin });
  const session: Session = { role: 'admin', token: res.token, building_id: buildingId, at: Date.now() };
  saveSession(session);
  const view = stripToken(res) as AdminView;
  saveCachedView('admin', view);
  setState({ session, admin: view, resident: null, x: null, y: null, loadedAt: Date.now(), loginNotice: null });
}

/** يجيب الشاشة من جديد. لو فشل، الكاش بيفضل معروض. */
export async function refreshView(): Promise<void> {
  const s = state.session;
  if (s?.role === 'resident') {
    const v = await call('r_view', {});
    saveCachedView('resident', v);
    setState({ resident: v, loadedAt: Date.now() });
  } else if (s?.role === 'admin') {
    const v = await call('a_view', {});
    saveCachedView('admin', v);
    setState({ admin: v, loadedAt: Date.now() });
  }
}

export async function logout(): Promise<void> {
  const s = state.session;
  if (s) {
    const action = s.role === 'guard' || s.role === 'nrg' ? 'y_logout' : 'logout';
    // الخروج المحلي ما يستناش السيرفر (ممكن مفيش نت)
    call(action, {}, { ignoreSession: true }).catch(() => {});
  }
  clearSession();
  setState({ session: null, resident: null, admin: null, x: null, y: null, loadedAt: null, loginNotice: null });
  replace({ name: 'login' });
}

/** يحفظ جلسة جاهزة (بعد تسجيل عمارة، أو دخول الأمن/NRG) */
export function startSession(session: Session, admin?: AdminView): void {
  saveSession(session);
  if (admin) saveCachedView('admin', admin);
  setState({ session, admin: admin ?? null, resident: null, x: null, y: null, loadedAt: admin ? Date.now() : null, loginNotice: null });
}

export async function refreshX(): Promise<void> {
  const v = await call('x_view', {});
  const data: XView = { polls: v.polls ?? [], visitors: v.visitors ?? [], maintenance: v.maintenance ?? [] };
  saveCachedView('x', data);
  setState({ x: data });
}

export async function refreshY(): Promise<void> {
  const v = await call('y_view', {});
  const data: YView = { plans: v.plans ?? [], budget: v.budget ?? null, guards: v.guards ?? [], categories: v.categories ?? [] };
  saveCachedView('y', data);
  setState({ y: data });
}
