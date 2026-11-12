import { expect, test } from '@playwright/test';
import { collectErrors, expectNoHorizontalScroll, expectTapTargets, mockApi } from './mock';

const API = 'https://api.nrg-egypt.com/webhook/omara-api';

test.describe('الأساس', () => {
  test('شاشة الدخول: RTL، مفيش أخطاء console، مفيش scroll بالعرض، الأزرار 44px', async ({ page }) => {
    const errors = collectErrors(page);
    await mockApi(page);
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'عمارتنا' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByLabel('كود الدفع')).toHaveAttribute('inputmode', 'numeric');
    await expect(page.getByLabel('كود الدفع')).toHaveAttribute('dir', 'ltr');
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    // الزرار الأساسي 56px
    const h = await page.getByRole('button', { name: 'ادخل' }).evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(56);
    // الخط
    const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(font).toContain('IBM Plex Sans Arabic');
    expect(errors).toEqual([]);
  });

  test('الحقل المطلوب بيمنع الإرسال برسالة واضحة', async ({ page }) => {
    const sent = await mockApi(page);
    await page.goto('./');
    await page.getByRole('button', { name: 'ادخل' }).click();
    await expect(page.getByRole('alert')).toContainText('اكتب كود الدفع');
    await page.getByLabel('كود الدفع').fill('1234');
    await page.getByRole('button', { name: 'ادخل' }).click();
    await expect(page.getByRole('alert')).toContainText('8 أرقام');
    expect(sent).toHaveLength(0);
  });

  test('أمين الصندوق: الحقول المطلوبة', async ({ page }) => {
    const sent = await mockApi(page);
    await page.goto('./');
    await page.getByRole('tab', { name: 'أمين الصندوق' }).click();
    await page.getByRole('button', { name: 'ادخل' }).click();
    await expect(page.getByText('اكتب كود العمارة')).toBeVisible();
    await expect(page.getByText('اكتب الرقم السري')).toBeVisible();
    expect(sent).toHaveLength(0);
  });
});

test.describe('سيناريو 1: دخول الساكن', () => {
  test('بالكود (وبيقبل أرقام عربي)، والـ payload مطابق لـ API.md', async ({ page }) => {
    const errors = collectErrors(page);
    const sent = await mockApi(page);
    await page.goto('./');
    await page.getByLabel('كود الدفع').fill('٤٨٢٧١٩٣٠');
    // الكود الكامل بيدخل لوحده من غير ضغط
    await expect(page).toHaveURL(/#r\/home$/);
    await expect(page.getByTestId('balance-due')).toHaveText('350 ج.م');
    await expect(page.getByText('18,450 ج.م')).toBeVisible();

    const login = sent.find((s) => s.body.action === 'r_login')!;
    expect(login.url).toBe(API);
    expect(login.contentType).toBe('text/plain;charset=utf-8');
    expect(login.body).toEqual({ action: 'r_login', code: '48271930' });

    const view = sent.find((s) => s.body.action === 'r_view')!;
    expect(view.body).toEqual({ action: 'r_view', token: 'tok-r' });

    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    expect(errors).toEqual([]);
  });

  test('بلينك #c= والكود ما يفضلش في اللينك', async ({ page }) => {
    const sent = await mockApi(page);
    await page.goto('./#c=48271930');
    await expect(page).toHaveURL(/#r\/home$/);
    await expect(page.getByTestId('balance-due')).toBeVisible();
    expect(sent[0].body).toEqual({ action: 'r_login', code: '48271930' });
    expect(page.url()).not.toContain('48271930');
  });

  test('لينك #c= بكود غلط بيعرض الغلط زي ما هو من الـ API', async ({ page }) => {
    await mockApi(page);
    await page.goto('./#c=11112222');
    await expect(page.getByRole('alert')).toHaveText('الكود ده مش موجود. راجعه تاني.');
    await expect(page.getByLabel('كود الدفع')).toHaveValue('11112222');
  });

  test('الجلسة بتتحفظ بعد الـ reload', async ({ page }) => {
    const sent = await mockApi(page);
    await page.goto('./#c=48271930');
    await expect(page.getByTestId('balance-due')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/#r\/home$/);
    await expect(page.getByTestId('balance-due')).toBeVisible();
    expect(sent.filter((s) => s.body.action === 'r_login')).toHaveLength(1);
    expect(sent.filter((s) => s.body.action === 'r_view').length).toBeGreaterThanOrEqual(2);
  });

  test('الشريط اللي تحت بيتنقل بين التابات، والخروج بيرجّع للدخول', async ({ page }) => {
    const sent = await mockApi(page);
    await page.goto('./#c=48271930');
    const nav = page.getByRole('navigation', { name: 'القائمة الرئيسية' });
    await expect(nav.getByRole('link')).toHaveCount(5);
    await nav.getByRole('link', { name: 'الدفتر' }).click();
    await expect(page).toHaveURL(/#r\/ledger$/);
    await expect(nav.getByRole('link', { name: 'الدفتر' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'المزيد' }).click();
    await page.getByRole('button', { name: 'خروج' }).click();
    await expect(page).toHaveURL(/#login$/);
    expect(sent.some((s) => s.body.action === 'logout' && s.body.token === 'tok-r')).toBe(true);
    const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('omara.')));
    expect(stored).toEqual([]);
  });
});

test.describe('سيناريو 7: الجلسة المنتهية', () => {
  test('رد SESSION بيرجّع لشاشة الدخول برسالة', async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('omara.session', JSON.stringify({ role: 'resident', token: 'expired', at: 0 }));
    });
    await page.goto('./#r/home');
    await expect(page).toHaveURL(/#login$/);
    await expect(page.getByText('الجلسة خلصت. ادخل تاني.')).toBeVisible();
  });

  test('من غير جلسة، أي تاب بيرجع للدخول', async ({ page }) => {
    await mockApi(page);
    await page.goto('./#a/units');
    await expect(page).toHaveURL(/#login$/);
  });
});

test.describe('أمين الصندوق', () => {
  test('الدخول والـ payload', async ({ page }) => {
    const errors = collectErrors(page);
    const sent = await mockApi(page);
    await page.goto('./');
    await page.getByRole('tab', { name: 'أمين الصندوق' }).click();
    await page.getByLabel('كود العمارة').fill('test14');
    await expect(page.getByLabel('كود العمارة')).toHaveValue('TEST14');
    await page.getByLabel('الرقم السري').fill('١١١٢٢٢');
    await page.getByRole('button', { name: 'ادخل' }).click();
    await expect(page).toHaveURL(/#a\/home$/);
    await expect(page.getByRole('heading', { name: 'لوحة الاتحاد' })).toBeVisible();
    expect(sent[0].body).toEqual({ action: 'a_login', building_id: 'TEST14', pin: '111222' });
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    expect(errors).toEqual([]);
  });

  test('رقم سري غلط: الغلط بيتعرض زي ما هو', async ({ page }) => {
    await mockApi(page);
    await page.goto('./#login/admin');
    await page.getByLabel('كود العمارة').fill('TEST14');
    await page.getByLabel('الرقم السري').fill('000000');
    await page.getByRole('button', { name: 'ادخل' }).click();
    await expect(page.getByRole('alert')).toHaveText('الرقم السري غلط.');
  });

  test('الساكن ما يدخلش تابات أمين الصندوق', async ({ page }) => {
    await mockApi(page);
    await page.goto('./#c=48271930');
    await expect(page).toHaveURL(/#r\/home$/);
    await page.goto('./#a/units');
    await expect(page).toHaveURL(/#r\/home$/);
  });
});

test('السيرفر مش بيرد: آخر شاشة محفوظة بتتعرض مع رسالة', async ({ page }) => {
  await mockApi(page);
  await page.goto('./#c=48271930');
  await expect(page.getByTestId('balance-due')).toBeVisible();
  await page.unroute('https://api.nrg-egypt.com/**');
  await page.route('https://api.nrg-egypt.com/**', (r) => r.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByTestId('balance-due')).toHaveText('350 ج.م');
  await expect(page.getByRole('alert')).toContainText('بتشوف آخر بيانات اتحمّلت');
  await expect(page.getByRole('button', { name: 'جرّب تاني' })).toBeVisible();
});
