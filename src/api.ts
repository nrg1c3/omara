/**
 * عميل API واحد لعمارتنا. الأنواع مأخوذة من API.md.
 *
 * - كل الطلبات POST بـ Content-Type: text/plain;charset=utf-8 (من غير CORS preflight) والـ body JSON.
 * - { ok:false, error:"SESSION" } ← بنمسح الجلسة ونرجّع لشاشة الدخول (onSessionExpired).
 * - { ok:false, error } ← بنرمي ApiError برسالة الـ error زي ما هي (عربي جاهز).
 *
 * الحقول اللي API.md ما وصفش شكلها بالتفصيل متعلّمة optional أو loose
 * لحد ما نقارنها بالردود الحقيقية من TEST14.
 */

export const API_BASE = 'https://api.nrg-egypt.com/webhook';
export const ENDPOINTS = {
  api: `${API_BASE}/omara-api`,
  x: `${API_BASE}/omara-x`,
  y: `${API_BASE}/omara-y`,
  chat: `${API_BASE}/075883eb-3a24-4472-962a-02cdb3bac3cc/chat`
} as const;
export type Endpoint = 'api' | 'x' | 'y';

/* ============================== أنواع مشتركة ============================== */
// الأشكال دي متطابقة مع ردود TEST14 الحقيقية (نوفمبر 2026).

export type YearMonth = string; // YYYY-MM
export type ISODate = string; // YYYY-MM-DD
export type DataUrl = string; // data:image/jpeg;base64,...
export type PayMethod = string; // "كاش مع أمين الصندوق" | "إنستاباي" | "تحويل بنكي" | "محفظة موبايل"
type Loose = Record<string, unknown>;

export interface Building extends Loose {
  id: string;
  name: string;
  address?: string;
  due_day?: number;
  payment_info?: string;
  treasurer_name?: string;
  treasurer_phone?: string;
  treasurer_email?: string;
}

export interface UnitInfo extends Loose {
  unit: string;
  owner_name?: string;
  monthly_fee?: number;
  phone_on_file?: boolean;
}

export interface MonthRow extends Loose {
  month: YearMonth;
  label: string;
  due: number;
  paid: number;
  remaining: number;
  due_date?: ISODate;
}

export interface Account extends Loose {
  balance_due: number;
  credit: number;
  unpaid: MonthRow[];
  months: MonthRow[];
}

export interface Fund extends Loose {
  balance: number;
  month?: YearMonth;
  month_label?: string;
  due_this_month?: number;
  collected_this_month?: number;
  paid_units: number;
  total_units: number;
  spent_this_month: number;
  expense_months: { month: YearMonth; label: string; total: number }[];
}

export interface Payment extends Loose {
  id?: number;
  unit?: string;
  month?: YearMonth | 'opening';
  label?: string;
  amount: number;
  method?: PayMethod;
  paid_on?: ISODate;
  receipt_id?: string;
  ref?: string;
  note?: string;
  by?: string;
}

/** مطالبة (تحويل رفعه الساكن). status: 'قيد المراجعة' | 'اتقبل' | 'اترفض' */
export interface Claim extends Loose {
  id: number | string;
  no?: string;
  unit?: string;
  amount?: number;
  ai_amount?: number | null;
  month?: YearMonth;
  month_label?: string;
  method?: string;
  paid_on?: ISODate;
  reference?: string;
  status?: string;
  review_note?: string;
  ai_note?: string;
  receipt_id?: string;
  date?: string;
}

export interface LedgerEntry extends Loose {
  no: number;
  date: ISODate;
  item: string;
  category: string;
  vendor?: string;
  amount: number;
  has_receipt?: boolean;
  receipt_id?: string;
  /** رقم القيد اللي التصحيح ده بيصححه */
  corrects?: string;
  reason?: string;
  by?: string;
}

export type TicketUrgency = 'عاجل' | 'عادي';
export type TicketStatus = 'جديد' | 'جاري الشغل' | 'اتحل';
export type ServiceStatus = 'جديد' | 'اتواصل مع الفني' | 'اتنفذ' | 'اتلغى';

export interface Ticket extends Loose {
  id: number;
  no?: string;
  unit?: string;
  issue: string;
  category: string;
  urgency: TicketUrgency;
  status: TicketStatus;
  resolution?: string;
  date?: ISODate;
  receipt_id?: string;
  reporter?: string;
  mine?: boolean;
}

export interface ServiceRequest extends Loose {
  id: number;
  no?: string;
  unit?: string;
  trade: string;
  description: string;
  preferred_time?: string;
  status: ServiceStatus;
  provider_name?: string;
  provider_phone?: string;
  price?: number;
  resident_name?: string;
  resident_phone?: string;
  date?: ISODate;
}

export interface Notice extends Loose {
  no?: string;
  title: string;
  body: string;
  date?: ISODate;
  by?: string;
}

/** الحاجات المشتركة بين شاشة الساكن وشاشة أمين الصندوق */
export interface ViewCommon extends Loose {
  building: Building;
  payments: Payment[];
  claims: Claim[];
  fund: Fund;
  ledger: LedgerEntry[];
  tickets: Ticket[];
  services: ServiceRequest[];
  notices: Notice[];
  trades?: string[];
  ticket_categories?: string[];
}

/** شاشة الساكن (role: "resident") */
export interface ResidentView extends ViewCommon {
  role: 'resident';
  unit: UnitInfo;
  pay_code: string;
  account: Account;
}

export interface LateUnit extends Loose {
  unit: string;
  owner_name?: string;
  phone?: string;
  amount: number;
  months?: number;
  months_text?: string;
  /** نص رسالة التذكير */
  text: string;
  /** لينك wa.me جاهز (فاضي لو مفيش تليفون) */
  wa: string;
}

export interface AdminUnit extends Loose {
  id: number;
  unit: string;
  owner_name?: string;
  phone?: string;
  monthly_fee?: number;
  pay_code: string;
  balance_due?: number;
  credit?: number;
  unpaid?: { month: YearMonth; label: string; remaining: number }[];
}

/** شاشة أمين الصندوق (role: "admin") */
export interface AdminView extends ViewCommon {
  role: 'admin';
  admin_name?: string;
  late: LateUnit[];
  units: AdminUnit[];
  group_message: string;
  open_tickets: number;
  app_url: string;
  expense_categories?: string[];
  methods?: PayMethod[];
}

/* ============================== omara-x ============================== */

export interface Poll extends Loose {
  no: string;
  question: string;
  options: string[];
  ends_on?: ISODate;
  closed: boolean;
  by?: string;
  my_choice?: string;
  voted?: number;
  total_units?: number;
  participation?: number;
  results?: { option: string; count: number }[];
  voters?: string[];
}

/** status: 'ساري' | 'دخل' (الملغي ما بيرجعش) */
export interface NrgBuilding {
  id: string;
  name: string;
  treasurer?: string;
  phone?: string;
  units: number;
  monthly_due: number;
  collected: number;
  /** نسبة التحصيل من 0 لـ 100 */
  rate: number;
  fund: number;
  pending_claims: number;
  services: number;
  commission: number;
  since?: string;
  active?: boolean;
}

export interface NrgView {
  ok?: boolean;
  month?: string;
  buildings: NrgBuilding[];
  totals?: { buildings: number; units: number; monthly_due: number; collected: number; services: number; commission: number; subscription_estimate: number };
}

export interface Visitor extends Loose {
  code: string;
  name: string;
  date: ISODate;
  note?: string;
  unit?: string;
  status?: string;
}

export interface MaintenanceTask extends Loose {
  no: string;
  title: string;
  every_days: number;
  last_done?: ISODate;
  next_due?: ISODate;
  days_left?: number;
  status?: string;
  vendor?: string;
}

export interface XView {
  polls: Poll[];
  visitors: Visitor[];
  maintenance: MaintenanceTask[];
}

/* ============================== omara-y ============================== */

export interface InstallmentPlan extends Loose {
  no: string;
  unit: string;
  total: number;
  months: number;
  per_month: number;
  start?: YearMonth;
  paid: number;
  left: number;
  late_installments: number;
  status: string;
  note?: string;
  schedule: { month: YearMonth; label: string; amount: number; done: boolean; due: boolean }[];
}

export interface BudgetCategory extends Loose {
  category: string;
  monthly: number;
  spent: number;
  pct: number;
  over: boolean;
}

export interface Guard extends Loose {
  id: number;
  name: string;
}

export interface YView {
  plans: InstallmentPlan[];
  /** لأمين الصندوق بس (للساكن null) */
  budget?: { month?: string; categories: BudgetCategory[]; total_budget?: number; total_spent?: number } | null;
  guards?: Guard[];
  categories?: string[];
}

export interface Report extends Loose {
  opening_balance: number;
  income: number;
  expense: number;
  closing_balance: number;
  months: Loose[];
  categories: Loose[];
  expenses: LedgerEntry[];
  receipts_pct: number;
}

/* ============================== الإيصالات ============================== */

export type ReceiptKind = 'claim' | 'ticket' | 'payment' | 'expense';

export interface ReceiptReading {
  receipt_id: string;
  read_ok: boolean;
  amount?: number | null;
  date?: string | null;
  reference?: string | null;
  method?: string | null;
  vendor?: string | null;
  item?: string | null;
  category?: string | null;
  suggested_month?: YearMonth | null;
  note?: string | null;
}

export interface RegisterUnitInput {
  unit: string;
  owner_name: string;
  phone: string;
  monthly_fee: number;
}

/* ============================== خريطة الـ actions ============================== */

type None = Record<string, never>;
interface Def<E extends Endpoint, Req, Res> {
  ep: E;
  req: Req;
  res: Res;
}

/** كل action ← الـ endpoint والمدخلات والرد. token وrole بيتضافوا لوحدهم. */
export interface Actions {
  // ---- omara-api: الدخول ----
  r_login: Def<'api', { code: string }, ResidentView & { token: string }>;
  a_login: Def<'api', { building_id: string; pin: string }, AdminView & { token: string }>;
  r_view: Def<'api', None, ResidentView>;
  a_view: Def<'api', None, AdminView>;
  logout: Def<'api', None, Loose>;
  register: Def<
    'api',
    {
      name: string;
      address: string;
      due_day: number;
      payment_info: string;
      default_fee: number;
      treasurer_name: string;
      treasurer_phone: string;
      treasurer_email: string;
      charge_current: boolean;
      units: RegisterUnitInput[];
    },
    { building_id: string; pin: string; token: string; units: { unit: string; pay_code: string }[] }
  >;

  // ---- omara-api: الإيصالات ----
  read_receipt: Def<'api', { image: DataUrl; kind: ReceiptKind; unit?: string }, ReceiptReading>;
  receipt: Def<'api', { receipt_id: string }, { src: DataUrl }>;

  // ---- omara-api: الساكن ----
  r_claim: Def<
    'api',
    {
      receipt_id: string;
      amount: number;
      month: YearMonth;
      method: PayMethod;
      paid_on: ISODate;
      reference: string;
      ai_amount?: number | null;
      ai_note?: string | null;
    },
    Loose
  >;
  r_ticket: Def<'api', { category: string; issue: string; urgency: TicketUrgency; receipt_id?: string }, Loose>;
  r_service: Def<'api', { trade: string; description: string; preferred_time: string; phone: string }, Loose>;

  // ---- omara-api: أمين الصندوق ----
  a_pay: Def<
    'api',
    {
      unit: string;
      amount: number;
      allocate: boolean;
      month?: YearMonth;
      method: PayMethod;
      paid_on: ISODate;
      reference?: string;
      receipt_id?: string;
      ai_amount?: number | null;
      ai_note?: string | null;
    },
    { receipt_text: string; wa: string } & Loose
  >;
  a_expense: Def<
    'api',
    {
      kind: 'expense' | 'correction' | 'opening';
      item: string;
      category: string;
      vendor?: string;
      amount: number;
      entry_date: ISODate;
      receipt_id?: string;
      corrects_entry?: string | number;
      reason?: string;
    },
    Loose
  >;
  a_claim: Def<'api', { id: string | number; decision: 'accept' | 'reject'; note?: string; amount?: number }, { message?: string; receipt_text?: string; wa?: string } & Loose>;
  a_ticket: Def<'api', { id: string | number; status: TicketStatus; resolution?: string }, Loose>;
  a_service: Def<'api', { id: string | number; status: ServiceStatus; price?: number }, Loose>;
  a_notice: Def<'api', { title: string; body: string }, Loose>;
  a_unit: Def<'api', { id: string | number; owner_name?: string; phone?: string; monthly_fee?: number }, Loose>;
  a_building: Def<'api', { payment_info?: string; treasurer_phone?: string; treasurer_email?: string }, Loose>;
  a_pin: Def<'api', { old_pin: string; new_pin: string }, Loose>;

  // ---- omara-x ----
  x_view: Def<'x', None, XView & Loose>;
  x_poll_add: Def<'x', { question: string; options: string[]; ends_on: ISODate }, { group_text: string } & Loose>;
  x_poll_close: Def<'x', { poll_no: string }, { group_text: string } & Loose>;
  x_vote: Def<'x', { poll_no: string; choice: string }, Loose>;
  x_visitor_add: Def<'x', { visitor_name: string; visit_date: ISODate; note?: string }, { code: string; share_text: string }>;
  x_visitor_cancel: Def<'x', { code: string }, Loose>;
  x_visitor_check: Def<'x', { code: string }, { valid: boolean } & Loose>;
  x_maint_add: Def<'x', { title: string; every_days: number; last_done: ISODate; vendor?: string }, Loose>;
  x_maint_done: Def<'x', { task_no: string; done_on: ISODate }, Loose>;

  // ---- omara-y ----
  y_view: Def<'y', None, YView & Loose>;
  y_plan_add: Def<'y', { unit: string; months: number; start_month: YearMonth; total?: number; note?: string }, { share_text: string; phone?: string } & Loose>;
  y_plan_cancel: Def<'y', { plan_no: string }, Loose>;
  y_budget_set: Def<'y', { category: string; monthly: number }, Loose>;
  y_report: Def<'y', { from: YearMonth; to: YearMonth }, Report>;
  y_guard_set: Def<'y', { name: string }, { pin: string; share_text: string } & Loose>;
  y_guard_off: Def<'y', { id: string | number }, Loose>;
  y_guard_login: Def<'y', { building_id: string; pin: string }, { token: string; visitors: Visitor[] } & Loose>;
  y_guard_view: Def<'y', None, { visitors: Visitor[] } & Loose>;
  y_guard_check: Def<'y', { code: string }, { valid: boolean; message: string } & Loose>;
  y_nrg_login: Def<'y', { key: string }, { token: string } & Loose>;
  y_nrg_view: Def<'y', None, NrgView>;
  y_logout: Def<'y', None, Loose>;
}

export type ActionName = keyof Actions;
export type Req<A extends ActionName> = Actions[A]['req'];
export type Res<A extends ActionName> = Actions[A]['res'] & { ok: true };

/** الـ endpoint بتاع كل action (وقت التشغيل). */
const ACTION_EP: { [A in ActionName]: Actions[A]['ep'] } = {
  r_login: 'api', a_login: 'api', r_view: 'api', a_view: 'api', logout: 'api', register: 'api',
  read_receipt: 'api', receipt: 'api',
  r_claim: 'api', r_ticket: 'api', r_service: 'api',
  a_pay: 'api', a_expense: 'api', a_claim: 'api', a_ticket: 'api', a_service: 'api',
  a_notice: 'api', a_unit: 'api', a_building: 'api', a_pin: 'api',
  x_view: 'x', x_poll_add: 'x', x_poll_close: 'x', x_vote: 'x', x_visitor_add: 'x',
  x_visitor_cancel: 'x', x_visitor_check: 'x', x_maint_add: 'x', x_maint_done: 'x',
  y_view: 'y', y_plan_add: 'y', y_plan_cancel: 'y', y_budget_set: 'y', y_report: 'y',
  y_guard_set: 'y', y_guard_off: 'y', y_guard_login: 'y', y_guard_view: 'y', y_guard_check: 'y',
  y_nrg_login: 'y', y_nrg_view: 'y', y_logout: 'y'
};

/** طلبات من غير توكن */
const PUBLIC_ACTIONS = new Set<ActionName>(['r_login', 'a_login', 'register', 'y_guard_login', 'y_nrg_login']);
/** طلبات الأمن وNRG في omara-y: ليها توكن خاص ومن غير role */
const NO_ROLE_ACTIONS = new Set<ActionName>([
  'y_guard_login', 'y_guard_view', 'y_guard_check', 'y_nrg_login', 'y_nrg_view', 'y_logout'
]);

/** القراءة بالـ AI بتاخد وقت أطول */
const SLOW_ACTIONS = new Set<ActionName>(['read_receipt', 'register']);

export function endpointOf(action: ActionName): Endpoint {
  return ACTION_EP[action];
}

/* ============================== الأخطاء ============================== */

export class ApiError extends Error {
  constructor(message: string, readonly code: 'API' | 'NETWORK' | 'TIMEOUT' | 'BAD_RESPONSE' | 'SESSION' = 'API') {
    super(message);
    this.name = 'ApiError';
  }
}
export class SessionExpiredError extends ApiError {
  constructor() {
    super('الجلسة خلصت. ادخل تاني.', 'SESSION');
    this.name = 'SessionExpiredError';
  }
}

export const MSG = {
  network: 'مفيش إنترنت أو الشبكة ضعيفة. اتأكد من النت وجرّب تاني.',
  timeout: 'السيرفر اتأخر في الرد. جرّب تاني كمان شوية.',
  bad: 'حصلت مشكلة في الرد من السيرفر. جرّب تاني.'
} as const;

/* ============================== الإعداد ============================== */

export type ApiRole = 'r' | 'a';

export interface ApiContext {
  /** التوكن الحالي (أو null لو مفيش جلسة) */
  getToken(): string | null;
  /** "r" للساكن أو "a" لأمين الصندوق، لطلبات omara-x وomara-y */
  getRole(): ApiRole | null;
  /** بيتنده لما الرد يكون SESSION */
  onSessionExpired(): void;
}

let ctx: ApiContext = {
  getToken: () => null,
  getRole: () => null,
  onSessionExpired: () => {}
};

export function configureApi(next: ApiContext): void {
  ctx = next;
}

export type Fetcher = typeof fetch;
let fetcher: Fetcher = (...args) => fetch(...args);
/** للاختبارات بس */
export function setFetcher(f: Fetcher): void {
  fetcher = f;
}

/* ============================== النداء ============================== */

export function buildBody<A extends ActionName>(action: A, params: Req<A>): Record<string, unknown> {
  const body: Record<string, unknown> = { action, ...(params as object) };
  if (!PUBLIC_ACTIONS.has(action)) {
    const token = ctx.getToken();
    if (token) body.token = token;
  }
  const ep = ACTION_EP[action];
  if ((ep === 'x' || ep === 'y') && !NO_ROLE_ACTIONS.has(action)) {
    const role = ctx.getRole();
    if (role) body.role = role;
  }
  return body;
}

async function postJSON(url: string, body: unknown, timeoutMs: number): Promise<Record<string, unknown>> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : undefined;
  let res: Response;
  try {
    res = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: ctrl?.signal,
      credentials: 'omit',
      cache: 'no-store'
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw new ApiError(MSG.timeout, 'TIMEOUT');
    throw new ApiError(MSG.network, 'NETWORK');
  } finally {
    if (timer) clearTimeout(timer);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(MSG.bad, 'BAD_RESPONSE');
  }
  if (!data || typeof data !== 'object') throw new ApiError(MSG.bad, 'BAD_RESPONSE');
  return data as Record<string, unknown>;
}

/**
 * نداء typed لأي action:
 *   const v = await call('r_login', { code: '12345670' });
 */
export interface CallOptions {
  /** ما تنادّيش onSessionExpired (مثلاً في الخروج) */
  ignoreSession?: boolean;
}

export async function call<A extends ActionName>(action: A, params: Req<A>, opts: CallOptions = {}): Promise<Res<A>> {
  const url = ENDPOINTS[ACTION_EP[action]];
  const timeout = SLOW_ACTIONS.has(action) ? 90_000 : 30_000;
  const data = await postJSON(url, buildBody(action, params), timeout);
  if (data.ok === true) return data as Res<A>;
  const err = typeof data.error === 'string' && data.error ? data.error : MSG.bad;
  if (err === 'SESSION') {
    if (!opts.ignoreSession) ctx.onSessionExpired();
    throw new SessionExpiredError();
  }
  throw new ApiError(err, 'API');
}

/** المساعد (شات n8n). الرد { output } مش { ok }. */
export async function chat(sessionId: string, chatInput: string): Promise<string> {
  const data = await postJSON(ENDPOINTS.chat, { action: 'sendMessage', sessionId, chatInput }, 90_000);
  if (typeof data.output === 'string') return data.output;
  throw new ApiError(MSG.bad, 'BAD_RESPONSE');
}
