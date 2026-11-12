/** بيانات mock على شكل ردود TEST14 الحقيقية (مش بيانات حقيقية لسكان). */
const building = { id: 'TEST14', name: 'عمارة تجربة', address: '[عنوان]', treasurer_name: 'أمين تجربة', treasurer_phone: '01000000000', payment_info: 'إنستاباي: test@instapay', due_day: 10 };
const fund = {
  balance: 18450, month: '2026-11', month_label: 'نوفمبر 2026', due_this_month: 2100, collected_this_month: 1750,
  paid_units: 21, total_units: 24, spent_this_month: 1200, expense_months: [{ month: '2026-10', label: 'أكتوبر 2026', total: 1570 }]
};
const ledger = [
  { no: 2, date: '2026-10-31', item: 'تصحيح صيانة الأسانسير', category: 'أسانسير', vendor: '', amount: -100, has_receipt: false, receipt_id: '', corrects: '1', reason: 'الفاتورة 800 مش 900', by: 'أمين' },
  { no: 1, date: '2026-10-03', item: 'صيانة الأسانسير الشهرية', category: 'أسانسير', vendor: 'شركة الأسانسير', amount: 900, has_receipt: true, receipt_id: 'R9', corrects: '', reason: '', by: 'أمين' }
];
const tickets = [{ id: 2, no: 'T1', unit: '7', issue: 'الأسانسير واقف', category: 'أسانسير', urgency: 'عاجل', status: 'جديد', resolution: '', date: '2026-11-01', receipt_id: '', reporter: 'ساكن', mine: true }];
const lists = {
  trades: ['سباكة', 'كهرباء', 'أخرى'],
  ticket_categories: ['أسانسير', 'سباكة ومياه', 'أخرى']
};

export const RESIDENT_VIEW = {
  ok: true,
  role: 'resident',
  building,
  unit: { unit: '7', owner_name: 'ساكن تجربة', monthly_fee: 350, phone_on_file: false },
  pay_code: '48271930',
  account: {
    balance_due: 350, credit: 0,
    unpaid: [{ month: '2026-11', due: 350, paid: 0, due_date: '2026-11-10', remaining: 350, label: 'نوفمبر 2026' }],
    months: [{ month: '2026-11', due: 350, paid: 0, due_date: '2026-11-10', remaining: 350, label: 'نوفمبر 2026' }]
  },
  payments: [{ month: '2026-10', label: 'أكتوبر 2026', amount: 350, method: 'إنستاباي', paid_on: '2026-10-31', receipt_id: 'R2', ref: '99' }],
  claims: [],
  fund, ledger, tickets, services: [], notices: [{ no: 'N1', title: 'إعلان تجربة', body: 'نص', date: '2026-11-02', by: 'أمين' }],
  ...lists
};

export const ADMIN_VIEW = {
  ok: true,
  role: 'admin',
  admin_name: 'أمين تجربة',
  building, fund, ledger, tickets, services: [], notices: [],
  payments: [],
  claims: [{ id: 7, no: 'C1', unit: '3', amount: 350, ai_amount: 400, ai_note: '', month: '2026-11', month_label: 'نوفمبر 2026', method: 'إنستاباي', paid_on: '2026-11-05', reference: '123456', receipt_id: 'R1', status: 'قيد المراجعة', review_note: '', date: '2026-11-05' }],
  late: [{ unit: '18', owner_name: 'ساكن 18', phone: '', amount: 1050, months: 3, months_text: 'سبتمبر، أكتوبر، نوفمبر', text: 'تذكير ودي', wa: '' }],
  units: [
    { id: 1, unit: '3', owner_name: 'ساكن 3', phone: '01001234567', monthly_fee: 350, pay_code: '19386427', balance_due: 700, credit: 0, unpaid: [{ month: '2026-10', label: 'أكتوبر 2026', remaining: 350 }] },
    { id: 2, unit: '7', owner_name: 'ساكن تجربة', phone: '', monthly_fee: 350, pay_code: '48271930', balance_due: 0, credit: 0, unpaid: [] }
  ],
  group_message: 'كشف حساب عمارة تجربة',
  open_tickets: 1,
  app_url: 'https://oa.nrg-egypt.com',
  expense_categories: ['صيانة', 'أسانسير', 'نظافة', 'أخرى'],
  methods: ['كاش مع أمين الصندوق', 'إنستاباي', 'تحويل بنكي', 'محفظة موبايل'],
  ...lists
};

export const X_VIEW = {
  ok: true,
  polls: [{ no: 'P1', question: 'نغيّر شركة الأسانسير؟', options: ['أيوه', 'لأ'], ends_on: '2026-12-01', closed: false, my_choice: '', voted: 0, total_units: 24, participation: 0, results: [{ option: 'أيوه', count: 0 }, { option: 'لأ', count: 0 }] }],
  visitors: [],
  maintenance: [{ no: 'M1', title: 'تنظيف خزان المية', every_days: 90, last_done: '2026-09-01', next_due: '2026-11-30', days_left: 18, status: 'تمام', vendor: '' }]
};

export const Y_VIEW = { ok: true, plans: [], budget: null, guards: [], categories: ['صيانة', 'نظافة'] };
