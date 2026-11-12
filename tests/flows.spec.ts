import { expect, test, type Page } from '@playwright/test';
import { ADMIN_VIEW } from './fixtures';
import { collectErrors, expectNoHorizontalScroll, expectTapTargets, mockApi, seedSession, TINY_PNG } from './mock';

const body = (sent: { body: Record<string, unknown> }[], action: string) => sent.find((s) => s.body.action === action)?.body;

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
});

const READING = { ok: true, receipt_id: 'R100', read_ok: true, amount: 350, date: '2026-11-05', reference: '777888', method: 'إنستاباي', suggested_month: '2026-11', note: 'التحويل واضح' };

test('سيناريو 2: الساكن يرفع إيصال ويأكد المطالبة', async ({ page }) => {
  const errors = collectErrors(page);
  const sent = await mockApi(page, { read_receipt: () => READING, r_claim: () => ({ ok: true }) });
  await page.goto('./#c=48271930');
  await page.getByRole('navigation', { name: 'القائمة الرئيسية' }).getByRole('link', { name: 'الدفع' }).click();
  await expect(page.getByText('إنستاباي: test@instapay')).toBeVisible();
  await page.getByRole('link', { name: 'حوّلت؟ ابعت الإيصال' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'r.png', mimeType: 'image/png', buffer: TINY_PNG });
  await expect(page.getByText('قرينا الإيصال')).toBeVisible();
  await expect(page.getByLabel('رقم العملية')).toHaveValue('777888');

  // الحقل المطلوب بيمنع الإرسال
  await page.getByLabel('رقم العملية').fill('');
  await page.getByRole('button', { name: 'ابعت لأمين الصندوق' }).click();
  await expect(page.getByText('اكتب رقم العملية')).toBeVisible();
  expect(body(sent, 'r_claim')).toBeUndefined();

  await page.getByLabel('رقم العملية').fill('777888');
  await page.getByRole('button', { name: 'ابعت لأمين الصندوق' }).click();
  await expect(page.getByText('التحويل اتبعت لأمين الصندوق')).toBeVisible();

  const rr = body(sent, 'read_receipt')!;
  expect(rr.kind).toBe('claim');
  expect(rr.token).toBe('tok-r');
  expect(String(rr.image)).toMatch(/^data:image\/jpeg;base64,/);
  expect(String(rr.image).length).toBeLessThan(300 * 1024 * 1.37);
  expect(body(sent, 'r_claim')).toEqual({
    action: 'r_claim', token: 'tok-r', receipt_id: 'R100', amount: 350, month: '2026-11', method: 'إنستاباي',
    paid_on: '2026-11-05', reference: '777888', ai_amount: 350, ai_note: 'التحويل واضح'
  });
  expect(errors).toEqual([]);
});

async function asAdmin(page: Page, overrides = {}) {
  const sent = await mockApi(page, overrides);
  await seedSession(page, 'admin', 'tok-a');
  return sent;
}

test('سيناريو 3: أمين الصندوق يوافق على مطالبة', async ({ page }) => {
  const sent = await asAdmin(page, { a_claim: () => ({ ok: true }) });
  await page.goto('./#a/home');
  await expect(page.getByTestId('collected')).toContainText('1,750');
  await page.getByRole('button', { name: 'وافق' }).click();
  await expect(page.getByText('اتقبل واتسجّل')).toBeVisible();
  expect(body(sent, 'a_claim')).toEqual({ action: 'a_claim', token: 'tok-a', id: 7, decision: 'accept', note: '', amount: 350 });
});

test('سيناريو 3: الرفض محتاج سبب', async ({ page }) => {
  const sent = await asAdmin(page, { a_claim: () => ({ ok: true }) });
  await page.goto('./#a/home');
  await page.getByRole('button', { name: 'ارفض' }).click();
  await expect(page.getByText('اكتب سبب الرفض')).toBeVisible();
  expect(body(sent, 'a_claim')).toBeUndefined();
});

test('سيناريو 3: أمين الصندوق يسجل دفعة بتوزيع تلقائي', async ({ page }) => {
  const sent = await asAdmin(page, { a_pay: () => ({ ok: true, receipt_text: 'إيصال: 700 جنيه', wa: '' }) });
  await page.goto('./#a/record');
  await page.getByRole('button', { name: 'سجّل الدفعة' }).click();
  await expect(page.getByText('اختار الشقة.')).toBeVisible();
  await page.getByLabel('الشقة').selectOption('3');
  await expect(page.getByLabel('المبلغ (جنيه)')).toHaveValue('700');
  await page.getByRole('button', { name: 'سجّل الدفعة' }).click();
  await expect(page.getByText('الدفعة اتسجلت')).toBeVisible();
  await expect(page.getByText('إيصال: 700 جنيه')).toBeVisible();
  const b = body(sent, 'a_pay')!;
  expect(b).toMatchObject({ action: 'a_pay', token: 'tok-a', unit: '3', amount: 700, allocate: true, method: 'كاش مع أمين الصندوق', reference: '' });
  expect(b.paid_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(b).not.toHaveProperty('month');
});

test('سيناريو 4: مصروف وتصحيح', async ({ page }) => {
  const sent = await asAdmin(page, { a_expense: () => ({ ok: true }) });
  await page.goto('./#a/record/expense');
  await page.getByLabel('المصروف', { exact: true }).fill('لمبات السلم');
  await page.getByLabel('النوع').selectOption('صيانة');
  await page.getByLabel('المبلغ (جنيه)').fill('١٢٠');
  await page.getByRole('button', { name: 'سجّل المصروف' }).click();
  await expect(page.getByText('المصروف اتسجل')).toBeVisible();
  expect(body(sent, 'a_expense')).toMatchObject({ action: 'a_expense', kind: 'expense', item: 'لمبات السلم', category: 'صيانة', vendor: '', amount: 120 });

  await page.goto('./#a/record/correction');
  await page.getByRole('button', { name: 'سجّل التصحيح' }).click();
  await expect(page.getByText('اختار القيد')).toBeVisible();
  await page.getByLabel('القيد اللي فيه غلط').selectOption('1');
  await page.getByLabel('الفرق (جنيه)').fill('-100');
  await page.getByLabel('السبب').fill('الفاتورة 800');
  await page.getByRole('button', { name: 'سجّل التصحيح' }).click();
  await expect(page.getByText('التصحيح اتسجل')).toBeVisible();
  const c = sent.filter((s) => s.body.action === 'a_expense')[1].body;
  expect(c).toMatchObject({ kind: 'correction', corrects_entry: 1, amount: -100, reason: 'الفاتورة 800', category: 'أسانسير', item: 'تصحيح صيانة الأسانسير الشهرية' });
});

test('سيناريو 5: بلاغ من الساكن', async ({ page }) => {
  const sent = await mockApi(page, { r_ticket: () => ({ ok: true }) });
  await page.goto('./#c=48271930');
  await page.getByRole('link', { name: 'بلّغ عن عطل' }).first().click();
  await page.getByRole('button', { name: 'ابعت البلاغ' }).click();
  await expect(page.getByText('اختار نوع العطل.')).toBeVisible();
  await page.getByLabel('نوع العطل').selectOption('سباكة ومياه');
  await page.getByLabel('إيه اللي حصل؟').fill('مية بتنزل من السقف');
  await page.getByRole('button', { name: 'عاجل' }).click();
  await page.getByRole('button', { name: 'ابعت البلاغ' }).click();
  await expect(page.getByText('أمين الصندوق وصله البلاغ')).toBeVisible();
  expect(body(sent, 'r_ticket')).toEqual({ action: 'r_ticket', token: 'tok-r', category: 'سباكة ومياه', issue: 'مية بتنزل من السقف', urgency: 'عاجل' });
});

test('سيناريو 5: أمين الصندوق يقفل البلاغ', async ({ page }) => {
  const sent = await asAdmin(page, { a_ticket: () => ({ ok: true }) });
  await page.goto('./#a/requests');
  await page.getByRole('button', { name: 'اتحل' }).click();
  await page.getByRole('button', { name: 'احفظ' }).click();
  await expect(page.getByText('اكتب اتعمل إيه')).toBeVisible();
  await page.getByLabel('اتعمل إيه؟').fill('الفني صلّح الموتور');
  await page.getByRole('button', { name: 'احفظ' }).click();
  await expect(page.getByText('البلاغ اتقفل')).toBeVisible();
  expect(body(sent, 'a_ticket')).toEqual({ action: 'a_ticket', token: 'tok-a', id: 2, status: 'اتحل', resolution: 'الفني صلّح الموتور' });
});

test('سيناريو 6: تصريح زائر والتحقق منه من شاشة الأمن', async ({ page }) => {
  const sent = await mockApi(page, {
    x_visitor_add: () => ({ ok: true, code: 'K7Q2MZ', share_text: 'تصريح دخول: K7Q2MZ' }),
    y_guard_login: (b) => (b.building_id === 'TEST14' && b.pin === '333444' ? { ok: true, token: 'tok-g', visitors: [{ code: 'K7Q2MZ', visitor_name: 'أحمد', unit: '7', visit_date: '2026-11-12' }] } : { ok: false, error: 'غلط' }),
    y_guard_view: () => ({ ok: true, visitors: [{ code: 'K7Q2MZ', visitor_name: 'أحمد', unit: '7', visit_date: '2026-11-12' }] }),
    y_guard_check: (b) => (b.code === 'K7Q2MZ' ? { ok: true, valid: true, message: 'أحمد زائر شقة 7. اتسجل دخوله.' } : { ok: true, valid: false, message: 'الكود ده مش موجود.' })
  });
  await page.goto('./#c=48271930');
  await page.getByRole('link', { name: 'تصريح زائر' }).click();
  await page.getByLabel('اسم الزائر').fill('أحمد');
  await page.getByRole('button', { name: 'اعمل التصريح' }).click();
  await expect(page.getByTestId('visitor-code')).toHaveText('K7Q2MZ');
  const add = body(sent, 'x_visitor_add')!;
  expect(add).toMatchObject({ action: 'x_visitor_add', token: 'tok-r', role: 'r', visitor_name: 'أحمد', note: '' });
  expect(sent.find((s) => s.body.action === 'x_visitor_add')!.url).toBe('https://api.nrg-egypt.com/webhook/omara-x');

  // الأمن
  await page.getByRole('navigation', { name: 'القائمة الرئيسية' }).getByRole('link', { name: 'المزيد' }).click();
  await page.getByRole('button', { name: 'خروج' }).click();
  await page.getByRole('link', { name: 'دخول الأمن' }).click();
  await page.getByLabel('كود العمارة').fill('TEST14');
  await page.getByLabel('الرقم السري').fill('333444');
  await page.getByRole('button', { name: 'ادخل' }).click();
  await expect(page.getByText('أحمد').first()).toBeVisible();
  await page.getByLabel('كود التصريح').fill('k7q2mz');
  await page.getByRole('button', { name: 'اتأكد' }).click();
  await expect(page.getByText('مسموح يدخل.')).toBeVisible();
  expect(body(sent, 'y_guard_login')).toEqual({ action: 'y_guard_login', building_id: 'TEST14', pin: '333444' });
  expect(body(sent, 'y_guard_check')).toEqual({ action: 'y_guard_check', token: 'tok-g', code: 'K7Q2MZ' });
  await page.getByLabel('كود التصريح').fill('XXXXXX');
  await page.getByRole('button', { name: 'اتأكد' }).click();
  await expect(page.getByText('مش مسموح.')).toBeVisible();
});

test('تسجيل عمارة: أدوار × شقق ← نجاح', async ({ page }) => {
  const sent = await mockApi(page, {
    register: (b) => ({ ok: true, building_id: 'B123', pin: '555111', token: 'tok-new', units: (b.units as { unit: string }[]).map((u, i) => ({ unit: u.unit, pay_code: String(10000000 + i) })) })
  });
  await page.goto('./#register');
  await page.getByRole('button', { name: 'التالي' }).click();
  await expect(page.getByText('اكتب اسم العمارة')).toBeVisible();
  await page.getByLabel('اسم العمارة').fill('عمارة النور');
  await page.getByLabel('العنوان').fill('شارع التحرير');
  await page.getByLabel('الاشتراك الشهري للشقة (جنيه)').fill('300');
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByLabel('عدد الأدوار').fill('2');
  await page.getByLabel('شقق في الدور').fill('3');
  await page.getByRole('button', { name: 'بالدور: 11، 12، 21...' }).click();
  await page.getByRole('button', { name: 'اعمل الشقق' }).click();
  await expect(page.getByText('الشقق (6)')).toBeVisible();
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByLabel('اسم أمين الصندوق').fill('محمود');
  await page.getByLabel('موبايل أمين الصندوق').fill('٠١٠١٢٣٤٥٦٧٨');
  await page.getByRole('button', { name: 'سجّل العمارة' }).click();
  await expect(page.getByTestId('reg-pin')).toHaveText('555111');
  const r = body(sent, 'register')!;
  expect(r).toMatchObject({ name: 'عمارة النور', address: 'شارع التحرير', due_day: 10, default_fee: 300, treasurer_name: 'محمود', treasurer_phone: '01012345678', treasurer_email: '', charge_current: true, payment_info: '' });
  expect((r.units as { unit: string }[]).map((u) => u.unit)).toEqual(['11', '12', '13', '21', '22', '23']);
  expect(r).not.toHaveProperty('token');
  await page.getByRole('button', { name: 'ادخل لوحة الاتحاد' }).click();
  await expect(page).toHaveURL(/#a\/home$/);
});

test('التصويت: الساكن يصوّت بـ role=r على omara-x', async ({ page }) => {
  const sent = await mockApi(page, { x_vote: () => ({ ok: true }) });
  await page.goto('./#c=48271930');
  await expect(page).toHaveURL(/#r\/home$/);
  await page.goto('./#r/more/polls');
  await page.getByRole('button', { name: 'أيوه' }).click();
  await page.getByRole('button', { name: 'صوّت', exact: true }).click();
  await expect.poll(() => body(sent, 'x_vote')).toEqual({ action: 'x_vote', token: 'tok-r', role: 'r', poll_no: 'P1', choice: 'أيوه' });
});

const RESIDENT_ROUTES = ['#r/home', '#r/pay', '#r/pay/claim', '#r/ledger', '#r/requests', '#r/requests/services', '#r/requests/visitors', '#r/requests/new-ticket', '#r/requests/new-service', '#r/requests/new-visitor', '#r/more', '#r/more/polls', '#r/more/notices', '#r/more/plans', '#r/more/chat', '#r/more/account', '#r/more/invite'];
const ADMIN_ROUTES = ['#a/home', '#a/record', '#a/record/expense', '#a/record/correction', '#a/record/opening', '#a/units', '#a/units/1', '#a/units/cards', '#a/requests', '#a/requests/services', '#a/more', '#a/more/report', '#a/more/group', '#a/more/ledger', '#a/more/notices', '#a/more/polls', '#a/more/maint', '#a/more/plans', '#a/more/budget', '#a/more/guards', '#a/more/building', '#a/more/pin', '#a/more/invite'];

test('كل شاشات الساكن: مفيش أخطاء console ولا scroll بالعرض والأزرار 44px', async ({ page }) => {
  const errors = collectErrors(page);
  await mockApi(page);
  await seedSession(page, 'resident', 'tok-r');
  for (const r of RESIDENT_ROUTES) {
    await page.goto(`./${r}`);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalScroll(page).catch((e) => {
      throw new Error(`${r}: ${e.message}`);
    });
    await expectTapTargets(page).catch((e) => {
      throw new Error(`${r}: ${e.message}`);
    });
  }
  expect(errors).toEqual([]);
});

test('كل شاشات أمين الصندوق: مفيش أخطاء console ولا scroll بالعرض والأزرار 44px', async ({ page }) => {
  const errors = collectErrors(page);
  await asAdmin(page);
  for (const r of ADMIN_ROUTES) {
    await page.goto(`./${r}`);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalScroll(page).catch((e) => {
      throw new Error(`${r}: ${e.message}`);
    });
    await expectTapTargets(page).catch((e) => {
      throw new Error(`${r}: ${e.message}`);
    });
  }
  expect(errors).toEqual([]);
});

test('الشقق: لينك واتساب فيه رقم الساكن', async ({ page }) => {
  await asAdmin(page);
  await page.goto('./#a/units');
  const href = await page.getByRole('link', { name: 'ابعت اللينك' }).first().getAttribute('href');
  expect(href).toContain('https://wa.me/201001234567?text=');
  expect(decodeURIComponent(href!)).toContain(`#c=${ADMIN_VIEW.units[0].pay_code}`);
});
