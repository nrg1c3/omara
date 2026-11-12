import { expect, test } from '@playwright/test';
import { collectErrors } from './mock';

/**
 * Smoke على الـ API الحقيقي (TEST14 بس، CLAUDE.md §6). بيقرا بس، وبيعمل logout في الآخر.
 * شغّله: npm run test:smoke
 * محتاج الـ origin (localhost:4173) يكون في ALLOWED في workflow n8n، وإلا الدخول هيترفض.
 */
test.skip(!process.env.SMOKE, 'شغّله بـ SMOKE=1');

test('دخول ساكن TEST14 بلينك #c= والخروج', async ({ page }) => {
  const errors = collectErrors(page);
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('https://api.nrg-egypt.com/')) bodies.push(JSON.parse(r.postData() ?? '{}'));
  });
  await page.goto('./#c=48271930');
  await expect(page).toHaveURL(/#r\/home$/, { timeout: 30_000 });
  await expect(page.getByTestId('balance-due')).toBeVisible();
  await page.getByRole('navigation', { name: 'القائمة الرئيسية' }).getByRole('link', { name: 'المزيد' }).click();
  const logoutReq = page.waitForResponse((r) => r.url().includes('omara-api') && (r.request().postData() ?? '').includes('"logout"'));
  await page.getByRole('button', { name: 'خروج' }).click();
  expect(await (await logoutReq).json()).toMatchObject({ ok: true });
  await expect(page).toHaveURL(/#login$/);
  expect(bodies.map((b) => b.action)).toEqual(expect.arrayContaining(['r_login', 'r_view', 'logout']));
  expect(errors).toEqual([]);
});
