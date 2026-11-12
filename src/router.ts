import { useEffect, useState } from 'preact/hooks';

/**
 * توجيه بالـ hash (يشتغل على أي دومين أو GitHub Pages أو Capacitor من غير إعدادات سيرفر).
 *
 *   #login              شاشة الدخول
 *   #c=48271930         دخول الساكن بالكود على طول
 *   #guard  #nrg        شاشة الأمن ولوحة NRG (زي النسخة الحالية)
 *   #register           سجّل عمارتك
 *   #r/<tab>            تابات الساكن
 *   #a/<tab>            تابات أمين الصندوق
 */
export const RESIDENT_TABS = ['home', 'pay', 'ledger', 'requests', 'more'] as const;
export const ADMIN_TABS = ['home', 'record', 'units', 'requests', 'more'] as const;
export type ResidentTab = (typeof RESIDENT_TABS)[number];
export type AdminTab = (typeof ADMIN_TABS)[number];

export type Route =
  | { name: 'login'; mode?: 'resident' | 'admin' }
  | { name: 'code'; code: string }
  | { name: 'guard' }
  | { name: 'nrg' }
  | { name: 'register' }
  | { name: 'about' }
  | { name: 'resident'; tab: ResidentTab; sub?: string }
  | { name: 'admin'; tab: AdminTab; sub?: string };

export function parseHash(hash: string): Route {
  const h = decodeURIComponent(hash.replace(/^#\/?/, '')).trim();
  if (!h || h === 'login') return { name: 'login' };
  if (h === 'login/admin' || h === 'admin') return { name: 'login', mode: 'admin' };
  if (/^(guard|nrg)&/.test(h)) return { name: h.startsWith('guard') ? 'guard' : 'nrg' };
  const code = /^c=(.+)$/.exec(h);
  if (code) return { name: 'code', code: code[1] };
  if (h === 'guard') return { name: 'guard' };
  if (h === 'nrg') return { name: 'nrg' };
  if (h === 'register') return { name: 'register' };
  if (h === 'about') return { name: 'about' };
  const [area, tab, ...rest] = h.split('/');
  const sub = rest.length ? rest.join('/') : undefined;
  if (area === 'r') {
    const t = (RESIDENT_TABS as readonly string[]).includes(tab) ? (tab as ResidentTab) : 'home';
    return { name: 'resident', tab: t, sub };
  }
  if (area === 'a') {
    const t = (ADMIN_TABS as readonly string[]).includes(tab) ? (tab as AdminTab) : 'home';
    return { name: 'admin', tab: t, sub };
  }
  return { name: 'login' };
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'login':
      return r.mode === 'admin' ? '#login/admin' : '#login';
    case 'code':
      return `#c=${encodeURIComponent(r.code)}`;
    case 'guard':
    case 'nrg':
    case 'register':
    case 'about':
      return `#${r.name}`;
    case 'resident':
      return `#r/${r.tab}${r.sub ? `/${r.sub}` : ''}`;
    case 'admin':
      return `#a/${r.tab}${r.sub ? `/${r.sub}` : ''}`;
  }
}

/** تنقل عادي (بيتسجل في الـ history عشان زرار الرجوع يشتغل) */
export function navigate(r: Route | string): void {
  const hash = typeof r === 'string' ? r : routeToHash(r);
  if (location.hash !== hash) location.hash = hash;
}

/** تنقل من غير ما يتسجل (مثلاً بعد الدخول بلينك #c= عشان الكود ما يفضلش في الـ history) */
export function replace(r: Route | string): void {
  const hash = typeof r === 'string' ? r : routeToHash(r);
  if (location.hash === hash) return;
  history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
