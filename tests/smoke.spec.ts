import { expect, test } from '@playwright/test';
import { collectErrors } from './mock';

/**
 * Smoke على الـ API الحقيقي (TEST14 بس، CLAUDE.md §6). بيقرا بس، وبيعمل logout في الآخر.
 * شغّله: npm run test:smoke
 * كود الساكن والرقم السري لأمين الصندوق التجريبيين من متغيرات البيئة (ما بيتحطوش في الريبو العام).
 * السيرفر بيرفض الطلبات من localhost، فلازم يتشغّل على النسخة المنشورة:
 *   SMOKE=1 SMOKE_URL=https://nrg1c3.github.io/omara/ OMARA_TEST_CODE=xxxxxxxx OMARA_TEST_PIN=xxxxxx npm run test:smoke
 */
test.skip(!process.env.SMOKE || !process.env.OMARA_TEST_CODE, 'شغّله بـ SMOKE=1 وOMARA_TEST_CODE');
const CODE = process.env.OMARA_TEST_CODE ?? '';

test('دخول ساكن TEST14 بلينك #c= والخروج', async ({ page }) => {
  const errors = collectErrors(page);
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('https://api.nrg-egypt.com/')) bodies.push(JSON.parse(r.postData() ?? '{}'));
  });
  await page.goto(`./#c=${CODE}`);
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

test.describe(() => {
  test.skip(!process.env.OMARA_TEST_PIN, 'محتاج OMARA_TEST_PIN');
});

test('أمين صندوق TEST14: الدخول والشاشات بتفتح بالبيانات الحقيقية والخروج', async ({ page }) => {
  const errors = collectErrors(page);
  const bad: string[] = [];
  page.on('response', async (r) => {
    if (!r.url().startsWith('https://api.nrg-egypt.com/')) return;
    const j = await r.json().catch(() => null);
    const action = JSON.parse(r.request().postData() ?? '{}').action;
    if (!j || j.ok !== true) bad.push(`${action}: ${j?.error}`);
  });
  await page.goto('./#login/admin');
  await page.getByLabel('كود العمارة').fill('TEST14');
  await page.getByLabel('الرقم السري').fill(process.env.OMARA_TEST_PIN!);
  await page.getByRole('button', { name: 'ادخل' }).click();
  await expect(page).toHaveURL(/#a\/home$/, { timeout: 30_000 });
  await expect(page.getByTestId('collected')).toBeVisible();
  for (const r of ['#a/units', '#a/requests', '#a/more', '#a/more/polls', '#a/more/maint', '#a/more/plans', '#a/more/budget', '#a/more/guards', '#a/more/ledger']) {
    await page.goto(`./${r}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toBeVisible();
  }
  await page.goto('./#a/more');
  await page.getByRole('button', { name: 'خروج' }).click();
  await expect(page).toHaveURL(/#login$/);
  await page.waitForTimeout(1500); // نستنى رد logout
  expect(bad).toEqual([]);
  expect(errors).toEqual([]);
});
