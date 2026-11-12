import type { Page, Request } from '@playwright/test';
import { ADMIN_VIEW, RESIDENT_VIEW, X_VIEW, Y_VIEW } from './fixtures';

export interface Sent {
  url: string;
  contentType: string | undefined;
  body: Record<string, unknown>;
}

type Handler = (body: Record<string, unknown>) => unknown;

export const DEFAULT_HANDLERS: Record<string, Handler> = {
  r_login: (b) => (b.code === '48271930' ? { ...RESIDENT_VIEW, token: 'tok-r' } : { ok: false, error: 'الكود ده مش موجود. راجعه تاني.' }),
  r_view: (b) => (b.token === 'tok-r' ? RESIDENT_VIEW : { ok: false, error: 'SESSION' }),
  a_login: (b) => (b.building_id === 'TEST14' && b.pin === '111222' ? { ...ADMIN_VIEW, token: 'tok-a' } : { ok: false, error: 'الرقم السري غلط.' }),
  a_view: (b) => (b.token === 'tok-a' ? ADMIN_VIEW : { ok: false, error: 'SESSION' }),
  logout: () => ({ ok: true }),
  y_logout: () => ({ ok: true }),
  x_view: () => X_VIEW,
  y_view: () => Y_VIEW
};

/** بيعمل mock لكل endpoints الـ API وبيسجل اللي اتبعت */
export async function mockApi(page: Page, overrides: Record<string, Handler> = {}) {
  const sent: Sent[] = [];
  const handlers = { ...DEFAULT_HANDLERS, ...overrides };
  await page.route('https://api.nrg-egypt.com/**', async (route) => {
    const req: Request = route.request();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(req.postData() ?? '{}');
    } catch {
      /* ignore */
    }
    sent.push({ url: req.url(), contentType: req.headers()['content-type'], body });
    const h = handlers[String(body.action)];
    const res = h ? h(body) : { ok: false, error: `mock: مفيش handler لـ ${String(body.action)}` };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res) });
  });
  return sent;
}

/** بيجمع أخطاء الـ console والصفحة */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function expectNoHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw > cw) throw new Error(`في scroll بالعرض: scrollWidth=${sw} > clientWidth=${cw}`);
}

/** كل الأزرار واللينكات الظاهرة 44px على الأقل */
export async function expectTapTargets(page: Page) {
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('button, a[href], [role="tab"]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ t: (el.textContent || el.getAttribute('aria-label') || '').trim(), r: el.getBoundingClientRect() }))
      .filter((x) => x.r.height < 44 || x.r.width < 44)
      .map((x) => `${x.t} (${Math.round(x.r.width)}×${Math.round(x.r.height)})`)
  );
  if (small.length) throw new Error(`أزرار أصغر من 44px: ${small.join('، ')}`);
}

/** يدخل بجلسة جاهزة من غير شاشة الدخول */
export async function seedSession(page: Page, role: 'resident' | 'admin' | 'guard', token: string) {
  await page.addInitScript(
    ([r, t]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('omara.session', JSON.stringify({ role: r, token: t, at: Date.now() }));
        sessionStorage.setItem('seeded', '1');
      }
    },
    [role, token]
  );
}

/** صورة PNG صغيرة (إيصال وهمي) */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC',
  'base64'
);
