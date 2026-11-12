/** بيانات mock على شكل ردود API.md (مش بيانات حقيقية). */
export const RESIDENT_VIEW = {
  ok: true,
  role: 'resident',
  building: { building_id: 'TEST14', name: 'عمارة تجربة' },
  unit: '7',
  pay_code: '48271930',
  account: { balance_due: 350, credit: 0, unpaid: [{ month: '2026-11', amount: 350 }], months: [] },
  payments: [],
  claims: [],
  fund: { balance: 18450, paid_units: 21, total_units: 24, spent_this_month: 1200, expense_months: [] },
  ledger: [],
  tickets: [],
  services: [],
  notices: []
};

export const ADMIN_VIEW = {
  ok: true,
  role: 'admin',
  building: { building_id: 'TEST14', name: 'عمارة تجربة' },
  payments: [],
  claims: [],
  fund: { balance: 18450, paid_units: 21, total_units: 24, spent_this_month: 1200, expense_months: [] },
  ledger: [],
  tickets: [],
  services: [],
  notices: [],
  late: [{ unit: '18', amount: 1050, text: 'تذكير', wa: 'https://wa.me/?text=x' }],
  units: [],
  group_message: '',
  open_tickets: 2,
  app_url: 'https://oa.nrg-egypt.com'
};
