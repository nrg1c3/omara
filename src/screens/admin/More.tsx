import { useEffect, useState } from 'preact/hooks';
import { call, type Report } from '../../api';
import { Button } from '../../components/Button';
import { Card, Progress } from '../../components/Card';
import { Field } from '../../components/Field';
import { DateField, SelectField } from '../../components/Form';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { Alert, ErrorMessage } from '../../components/Messages';
import { Badge, Empty, MenuLink, PageHeader, Row } from '../../components/Page';
import { ShareBox } from '../../components/ShareBox';
import { toast } from '../../components/Toast';
import { useInstall } from '../../lib/app';
import { readJSON, writeJSON } from '../../lib/storage';
import { onlyDigits } from '../../lib/digits';
import { currentMonth, formatMoney, formatMonth, formatNumber, today, formatDate } from '../../lib/format';
import { useAction } from '../../lib/useAction';
import { amountError, amountValue, emailError, hasErrors, phoneError, req } from '../../lib/validate';
import { buildingName } from '../../lib/view';
import { logout, refreshView, refreshX, refreshY, useAppState } from '../../store';
import { Ledger } from '../resident/Ledger';
import { Invite, Notices, PlanCard, PollCard } from '../resident/More';

export function AdminMore({ sub }: { sub?: string }) {
  switch (sub) {
    case 'notices':
      return <NoticesAdmin />;
    case 'polls':
      return <PollsAdmin />;
    case 'maint':
      return <Maintenance />;
    case 'plans':
      return <PlansAdmin />;
    case 'budget':
      return <Budget />;
    case 'report':
      return <ReportPage />;
    case 'guards':
      return <Guards />;
    case 'pin':
      return <ChangePin />;
    case 'building':
      return <BuildingSettings />;
    case 'group':
      return <GroupMessage />;
    case 'ledger':
      return (
        <>
          <a class="page-header__back" href="#a/more">
            <Icon name="arrowBack" size={22} />
            <span>رجوع</span>
          </a>
          <Ledger />
        </>
      );
    case 'invite':
      return <Invite back="#a/more" />;
    default:
      return <Menu />;
  }
}

function Menu() {
  const { x, y } = useAppState();
  const { canInstall, install } = useInstall();
  useEffect(() => {
    refreshX().catch(() => {});
    refreshY().catch(() => {});
  }, []);
  const maintDue = (x?.maintenance ?? []).filter((m) => (m.days_left ?? 99) <= 7).length;
  const over = (y?.budget?.categories ?? []).filter((c) => c.over).length;
  return (
    <>
      <PageHeader title="المزيد" />
      <nav class="menu" aria-label="إدارة العمارة">
        <MenuLink href="#a/more/report" icon="chart" label="تقرير الحسابات (PDF)" />
        <MenuLink href="#a/more/group" icon="send" label="رسالة جروب العمارة" />
        <MenuLink href="#a/more/ledger" icon="receipt" label="دفتر العمارة" />
        <MenuLink href="#a/more/notices" icon="megaphone" label="الإعلانات" />
        <MenuLink href="#a/more/polls" icon="vote" label="التصويت" />
        <MenuLink href="#a/more/maint" icon="calendar" label="الصيانة الدورية" note={maintDue ? `${formatNumber(maintDue)} قرّب ميعادها` : undefined} />
        <MenuLink href="#a/more/plans" icon="wallet" label="التقسيط" />
        <MenuLink href="#a/more/budget" icon="chart" label="الميزانية" note={over ? `${formatNumber(over)} عدّى الميزانية` : undefined} />
        <MenuLink href="#a/more/guards" icon="shield" label="حساب الأمن" />
      </nav>
      <nav class="menu" aria-label="الإعدادات">
        <MenuLink href="#a/more/building" icon="building" label="بيانات الدفع والتواصل" />
        <MenuLink href="#a/more/pin" icon="key" label="غيّر الرقم السري" />
        <MenuLink href="#a/more/invite" icon="gift" label="رشّح التطبيق لعمارة تانية" />
        {canInstall && <MenuLink onClick={install} icon="download" label="نزّل التطبيق على الموبايل" />}
      </nav>
      <Button variant="secondary" block icon="logout" onClick={() => logout()}>
        خروج
      </Button>
    </>
  );
}

/* ================= الإعلانات ================= */

function NoticesAdmin() {
  const [d, setD] = useState({ title: '', body: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  const submit = async () => {
    const e = { title: req(d.title, 'اكتب عنوان الإعلان.'), body: req(d.body, 'اكتب الإعلان.') };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('a_notice', { title: d.title.trim(), body: d.body.trim() }));
    if (ok) {
      toast('الإعلان نزل');
      setD({ title: '', body: '' });
      refreshView().catch(() => {});
    }
  };
  return (
    <>
      <Card title="إعلان جديد">
        <Field label="العنوان" value={d.title} onInput={(x) => setD({ ...d, title: x })} error={errors.title} />
        <Field label="الإعلان" kind="textarea" value={d.body} onInput={(x) => setD({ ...d, body: x })} error={errors.body} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          انشر الإعلان
        </Button>
      </Card>
      <Notices back="#a/more" />
    </>
  );
}

/* ================= التصويت ================= */

function PollsAdmin() {
  const { x } = useAppState();
  const [d, setD] = useState({ question: '', options: ['', ''], ends_on: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [groupText, setGroupText] = useState<string | null>(null);
  const act = useAction();
  useEffect(() => {
    refreshX().catch(() => {});
  }, []);

  const submit = async () => {
    const opts = d.options.map((o) => o.trim()).filter(Boolean);
    const e = { question: req(d.question, 'اكتب السؤال.'), options: opts.length < 2 ? 'اكتب اختيارين على الأقل.' : null, ends_on: req(d.ends_on, 'اختار آخر يوم للتصويت.') };
    setErrors(e);
    if (hasErrors(e)) return;
    const r = await act.run(() => call('x_poll_add', { question: d.question.trim(), options: opts, ends_on: d.ends_on }));
    if (r) {
      setGroupText(r.group_text);
      setD({ question: '', options: ['', ''], ends_on: '' });
      refreshX().catch(() => {});
      refreshView().catch(() => {});
    }
  };

  const close = async (no: string) => {
    if (!confirm('تقفل التصويت وتعلن النتيجة؟')) return;
    const r = await act.run(() => call('x_poll_close', { poll_no: no }));
    if (r) {
      setGroupText(r.group_text);
      refreshX().catch(() => {});
    }
  };

  return (
    <>
      <PageHeader title="التصويت" back="#a/more" subtitle="صوت واحد لكل شقة. التصويت بينزل إعلان للسكان لوحده." />
      {groupText && (
        <Card>
          <Alert tone="success">تمام. ابعت الرسالة دي لجروب العمارة.</Alert>
          <ShareBox text={groupText} />
        </Card>
      )}
      <Card title="تصويت جديد">
        <Field label="السؤال" value={d.question} onInput={(q) => setD({ ...d, question: q })} error={errors.question} />
        {d.options.map((o, i) => (
          <Field key={i} label={`اختيار ${i + 1}`} value={o} onInput={(val) => setD({ ...d, options: d.options.map((y, j) => (j === i ? val : y)) })} />
        ))}
        {errors.options && <ErrorMessage error={errors.options} />}
        {d.options.length < 6 && (
          <Button variant="ghost" icon="plus" onClick={() => setD({ ...d, options: [...d.options, ''] })}>
            زوّد اختيار
          </Button>
        )}
        <DateField label="آخر يوم" value={d.ends_on} onChange={(e) => setD({ ...d, ends_on: e })} error={errors.ends_on} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          ابدأ التصويت
        </Button>
      </Card>
      {(x?.polls ?? []).map((p) => (
        <PollCard key={p.no} poll={p}>
          {!p.closed && (
            <Button variant="secondary" loading={act.busy} onClick={() => close(p.no)}>
              اقفل التصويت وأعلن النتيجة
            </Button>
          )}
          {p.voters && p.voters.length > 0 && <span class="muted">الشقق اللي صوّتت: {p.voters.join('، ')}</span>}
        </PollCard>
      ))}
    </>
  );
}

/* ================= الصيانة ================= */

function Maintenance() {
  const { x } = useAppState();
  const [d, setD] = useState({ title: '', every_days: '', last_done: today(), vendor: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  useEffect(() => {
    refreshX().catch(() => {});
  }, []);
  const submit = async () => {
    const days = Number(onlyDigits(d.every_days));
    const e = { title: req(d.title, 'اكتب الشغلانة، زي: تنظيف خزان المية.'), every_days: days > 0 ? null : 'اكتب كل كام يوم، زي 90.', last_done: req(d.last_done, 'اختار آخر مرة اتعملت.') };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('x_maint_add', { title: d.title.trim(), every_days: days, last_done: d.last_done, vendor: d.vendor.trim() }));
    if (ok) {
      toast('اتضافت');
      setD({ title: '', every_days: '', last_done: today(), vendor: '' });
      refreshX().catch(() => {});
    }
  };
  const done = async (no: string) => {
    const ok = await act.run(() => call('x_maint_done', { task_no: no, done_on: today() }));
    if (ok) {
      toast('اتسجل، والميعاد الجاي اتحسب');
      refreshX().catch(() => {});
    }
  };
  const list = x?.maintenance ?? [];
  return (
    <>
      <PageHeader title="الصيانة الدورية" back="#a/more" subtitle="التطبيق بيفكّرك قبل الميعاد." />
      <ErrorMessage error={act.error} />
      {!x ? (
        <CardSkeleton />
      ) : list.length === 0 ? (
        <Empty icon="calendar">مفيش صيانة دورية متسجلة.</Empty>
      ) : (
        <div class="list">
          {list.map((m) => (
            <Row
              key={m.no}
              title={m.title}
              meta={[`كل ${m.every_days} يوم`, m.vendor, m.last_done ? `آخر مرة ${formatDate(m.last_done)}` : ''].filter(Boolean).join(' · ')}
              value={m.next_due ? formatDate(m.next_due, false) : undefined}
              badge={<Badge tone={(m.days_left ?? 99) < 0 ? 'danger' : (m.days_left ?? 99) <= 7 ? 'warn' : 'success'}>{(m.days_left ?? 0) < 0 ? `متأخرة ${Math.abs(m.days_left ?? 0)} يوم` : `باقي ${m.days_left} يوم`}</Badge>}
            >
              <div class="list-row__actions">
                <Button variant="secondary" icon="check" loading={act.busy} onClick={() => done(m.no)}>
                  اتعملت النهارده
                </Button>
              </div>
            </Row>
          ))}
        </div>
      )}
      <Card title="ضيف صيانة">
        <Field label="الشغلانة" value={d.title} onInput={(t) => setD({ ...d, title: t })} error={errors.title} />
        <Field label="كل كام يوم؟" kind="digits" maxLength={4} value={d.every_days} onInput={(t) => setD({ ...d, every_days: t })} error={errors.every_days} />
        <DateField label="آخر مرة اتعملت" value={d.last_done} onChange={(t) => setD({ ...d, last_done: t })} error={errors.last_done} />
        <Field label="الشركة أو الفني (اختياري)" value={d.vendor} onInput={(t) => setD({ ...d, vendor: t })} />
        <Button block loading={act.busy} onClick={submit}>
          ضيف
        </Button>
      </Card>
    </>
  );
}

/* ================= التقسيط ================= */

function PlansAdmin() {
  const { y, admin: v } = useAppState();
  const [d, setD] = useState({ unit: '', months: '6', start_month: currentMonth(), total: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [share, setShare] = useState<{ text: string; phone?: string } | null>(null);
  const act = useAction();
  useEffect(() => {
    refreshY().catch(() => {});
  }, []);
  const owing = (v?.units ?? []).filter((u) => Number(u.balance_due ?? 0) > 0);

  const submit = async () => {
    const months = Number(onlyDigits(d.months));
    const e = {
      unit: req(d.unit, 'اختار الشقة.'),
      months: months >= 2 && months <= 24 ? null : 'عدد الشهور من 2 لـ 24.',
      start_month: req(d.start_month, 'اختار أول شهر.'),
      total: d.total.trim() ? amountError(d.total) : null
    };
    setErrors(e);
    if (hasErrors(e)) return;
    const r = await act.run(() => call('y_plan_add', { unit: d.unit, months, start_month: d.start_month, ...(d.total.trim() ? { total: amountValue(d.total) } : {}), note: d.note.trim() }));
    if (r) {
      setShare({ text: r.share_text, phone: v?.units.find((u) => u.unit === d.unit)?.phone });
      setD({ unit: '', months: '6', start_month: currentMonth(), total: '', note: '' });
      refreshY().catch(() => {});
    }
  };
  const cancel = async (no: string) => {
    if (!confirm('تلغي خطة التقسيط دي؟ المتأخرات هترجع زي ما كانت.')) return;
    const ok = await act.run(() => call('y_plan_cancel', { plan_no: no }));
    if (ok) refreshY().catch(() => {});
  };

  return (
    <>
      <PageHeader title="التقسيط" back="#a/more" subtitle="قسّط المتأخر على شهور. أي دفعة للشقة بتتخصم من الأقساط لوحدها." />
      {share && (
        <Card>
          <Alert tone="success">الخطة اتعملت. ابعتها للساكن.</Alert>
          <ShareBox text={share.text} phone={share.phone} />
        </Card>
      )}
      <Card title="خطة جديدة">
        <SelectField
          label="الشقة"
          value={d.unit}
          onChange={(u) => setD({ ...d, unit: u })}
          options={(owing.length ? owing : v?.units ?? []).map((u) => ({ value: u.unit, label: `شقة ${u.unit}${u.balance_due ? ` (عليها ${formatNumber(u.balance_due)})` : ''}` }))}
          error={errors.unit}
        />
        <Field label="على كام شهر؟" kind="digits" maxLength={2} value={d.months} onInput={(m) => setD({ ...d, months: m })} error={errors.months} />
        <DateField type="month" label="أول قسط" value={d.start_month} onChange={(m) => setD({ ...d, start_month: m })} error={errors.start_month} />
        <Field label="المبلغ (اختياري)" hint="لو سبته فاضي، هيقسّط كل المتأخر." kind="amount" value={d.total} onInput={(m) => setD({ ...d, total: m })} error={errors.total} />
        <Field label="ملاحظة (اختياري)" value={d.note} onInput={(m) => setD({ ...d, note: m })} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          اعمل الخطة
        </Button>
      </Card>
      {!y ? (
        <CardSkeleton />
      ) : (
        y.plans.map((p) => (
          <PlanCard key={p.no} p={p}>
            {p.left > 0 && (
              <Button variant="secondary" icon="close" loading={act.busy} onClick={() => cancel(p.no)}>
                الغي الخطة
              </Button>
            )}
          </PlanCard>
        ))
      )}
    </>
  );
}

/* ================= الميزانية ================= */

function Budget() {
  const { y } = useAppState();
  const [d, setD] = useState({ category: '', monthly: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  useEffect(() => {
    refreshY().catch(() => {});
  }, []);
  const b = y?.budget;
  const submit = async () => {
    const e = { category: req(d.category, 'اختار النوع.'), monthly: amountError(d.monthly) };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('y_budget_set', { category: d.category, monthly: amountValue(d.monthly) }));
    if (ok) {
      toast('الميزانية اتحفظت');
      setD({ category: '', monthly: '' });
      refreshY().catch(() => {});
    }
  };
  return (
    <>
      <PageHeader title="الميزانية" back="#a/more" subtitle={b?.month ? `مصاريف ${b.month} قصاد الميزانية` : 'حدد ميزانية شهرية لكل نوع مصروف.'} />
      {b && b.total_budget !== undefined && (
        <Card>
          <span class="muted">الإجمالي</span>
          <span class="num big-num">
            {formatMoney(b.total_spent)} <span class="muted" style={{ fontSize: '16px' }}>من {formatMoney(b.total_budget)}</span>
          </span>
          <Progress value={b.total_spent ?? 0} max={b.total_budget || 1} label="المصروف من الميزانية" />
        </Card>
      )}
      {(b?.categories ?? []).length > 0 ? (
        <div class="list">
          {b!.categories.map((c) => (
            <Row key={c.category} title={c.category} value={`${formatNumber(c.spent)} / ${formatNumber(c.monthly)}`} badge={c.over ? <Badge tone="danger">عدّى الميزانية</Badge> : <Badge tone="success">{formatNumber(c.pct)}%</Badge>}>
              <Progress value={c.spent} max={c.monthly || 1} label={c.category} />
            </Row>
          ))}
        </div>
      ) : (
        y && <Empty icon="chart">لسه ما حددتش ميزانية.</Empty>
      )}
      <Card title="حدد أو عدّل ميزانية">
        <SelectField label="نوع المصروف" value={d.category} onChange={(c) => setD({ ...d, category: c })} options={y?.categories ?? []} error={errors.category} />
        <Field label="الميزانية الشهرية (جنيه)" kind="amount" value={d.monthly} onInput={(m) => setD({ ...d, monthly: m })} error={errors.monthly} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          احفظ
        </Button>
      </Card>
    </>
  );
}

/* ================= التقرير ================= */

function asRows(list: unknown[]): { label: string; values: [string, unknown][] }[] {
  return list.map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    const label = String(o.label ?? o.month ?? o.category ?? '');
    return { label, values: Object.entries(o).filter(([k, val]) => !['label', 'month', 'category'].includes(k) && (typeof val === 'number' || typeof val === 'string')) };
  });
}

const KEY_AR: Record<string, string> = { income: 'الدخل', expense: 'المصروف', total: 'الإجمالي', net: 'الصافي', amount: 'المبلغ', count: 'العدد', balance: 'الرصيد', collected: 'المحصّل', due: 'المستحق', spent: 'المصروف', pct: 'النسبة %' };

function ReportPage() {
  const { admin: v } = useAppState();
  const m = currentMonth();
  const [range, setRange] = useState({ from: m, to: m });
  const [r, setR] = useState<Report | null>(null);
  const act = useAction();
  const load = async () => {
    const res = await act.run(() => call('y_report', range));
    if (res) setR(res);
  };
  return (
    <>
      <div class="no-print stack">
        <PageHeader title="تقرير الحسابات" back="#a/more" subtitle="اطبعه أو احفظه PDF وابعته للملاك أو للجمعية العمومية." />
        <Card>
          <div class="grid-2">
            <DateField type="month" label="من" value={range.from} onChange={(x) => setRange({ ...range, from: x })} />
            <DateField type="month" label="لحد" value={range.to} onChange={(x) => setRange({ ...range, to: x })} />
          </div>
          <ErrorMessage error={act.error} />
          <Button block loading={act.busy} onClick={load}>
            اعرض التقرير
          </Button>
        </Card>
      </div>
      {r && (
        <>
          <header class="stack" style={{ gap: '2px' }}>
            <h2 class="screen__title">{buildingName(v?.building)}: كشف حساب</h2>
            <p class="screen__subtitle">
              من {formatMonth(range.from)} لحد {formatMonth(range.to)}
            </p>
          </header>
          <Card>
            <dl class="stack" style={{ gap: 0, margin: 0 }}>
              <div class="kv">
                <dt>رصيد أول المدة</dt>
                <dd>{formatMoney(r.opening_balance)}</dd>
              </div>
              <div class="kv">
                <dt>المحصّل</dt>
                <dd>{formatMoney(r.income)}</dd>
              </div>
              <div class="kv">
                <dt>المصروف</dt>
                <dd>{formatMoney(r.expense)}</dd>
              </div>
              <div class="kv">
                <dt>رصيد آخر المدة</dt>
                <dd>{formatMoney(r.closing_balance)}</dd>
              </div>
              <div class="kv">
                <dt>مصاريف بإيصال</dt>
                <dd>{formatNumber(r.receipts_pct)}%</dd>
              </div>
            </dl>
          </Card>
          {[
            ['بالشهر', r.months],
            ['بالنوع', r.categories]
          ].map(([title, list]) =>
            Array.isArray(list) && list.length > 0 ? (
              <section key={String(title)} class="stack">
                <h3 class="section-title">{String(title)}</h3>
                <div class="list">
                  {asRows(list).map((row, i) => (
                    <Row key={i} title={row.label} meta={row.values.map(([k, val]) => `${KEY_AR[k] ?? k}: ${typeof val === 'number' ? formatNumber(val) : val}`).join(' · ')} />
                  ))}
                </div>
              </section>
            ) : null
          )}
          {r.expenses?.length > 0 && (
            <section class="stack">
              <h3 class="section-title">المصاريف</h3>
              <div class="list">
                {r.expenses.map((e, i) => (
                  <Row key={i} title={`#${e.no ?? ''} ${e.item}`} meta={[e.category, e.vendor, formatDate(e.date), e.has_receipt ? 'بإيصال' : 'من غير إيصال'].filter(Boolean).join(' · ')} value={formatMoney(e.amount)} />
                ))}
              </div>
            </section>
          )}
          <p class="muted">اتعمل من تطبيق عمارتنا يوم {formatDate(today())}.</p>
          <div class="no-print">
            <Button block icon="print" onClick={() => window.print()}>
              اطبع أو احفظ PDF
            </Button>
          </div>
        </>
      )}
    </>
  );
}

/* ================= الأمن ================= */

function Guards() {
  const { y, admin: v } = useAppState();
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ pin: string; share_text: string } | null>(null);
  const act = useAction();
  useEffect(() => {
    refreshY().catch(() => {});
  }, []);
  const add = async () => {
    if (!name.trim()) {
      setErr('اكتب اسم البواب أو فرد الأمن.');
      return;
    }
    setErr(null);
    const r = await act.run(() => call('y_guard_set', { name: name.trim() }));
    if (r) {
      setCreated(r);
      setName('');
      refreshY().catch(() => {});
    }
  };
  const off = async (id: number, n: string) => {
    if (!confirm(`تقفل حساب ${n}؟ هيخرج من التطبيق على طول.`)) return;
    const ok = await act.run(() => call('y_guard_off', { id }));
    if (ok) {
      toast('الحساب اتقفل');
      refreshY().catch(() => {});
    }
  };
  return (
    <>
      <PageHeader title="حساب الأمن" back="#a/more" subtitle="البواب بيشوف زوار النهارده ويتأكد من كود التصريح. ما بيشوفش أي حسابات." />
      {created && (
        <Card>
          <Alert tone="warn">الرقم السري ده بيظهر مرة واحدة بس. ابعته للبواب دلوقتي.</Alert>
          <span class="muted">كود العمارة</span>
          <div class="code-box">{v?.building.id}</div>
          <span class="muted">الرقم السري</span>
          <div class="code-box" data-testid="guard-pin">
            {created.pin}
          </div>
          <ShareBox text={created.share_text} />
        </Card>
      )}
      {(y?.guards ?? []).length > 0 && (
        <div class="list">
          {y!.guards!.map((g) => (
            <Row key={g.id} title={g.name}>
              <div class="list-row__actions">
                <Button variant="secondary" icon="close" loading={act.busy} onClick={() => off(g.id, g.name)}>
                  اقفل الحساب
                </Button>
              </div>
            </Row>
          ))}
        </div>
      )}
      {(y?.guards ?? []).length === 0 && v && !readJSON<boolean>(`setup.noguard.${v.building.id}`) && (
        <Button variant="ghost" onClick={() => { writeJSON(`setup.noguard.${v.building.id}`, true); toast('تمام، مفيش بواب'); }}>
          العمارة مفيهاش بواب
        </Button>
      )}
      <Card title="حساب جديد">
        <Field label="الاسم" value={name} onInput={setName} error={err} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={add}>
          اعمل الحساب
        </Button>
      </Card>
    </>
  );
}

/* ================= الرقم السري ================= */

function ChangePin() {
  const [d, setD] = useState({ old_pin: '', new_pin: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  const submit = async () => {
    const e = {
      old_pin: d.old_pin.length === 6 ? null : 'اكتب الرقم السري الحالي (6 أرقام).',
      new_pin: d.new_pin.length === 6 ? (/^(\d)\1{5}$|^123456$|^654321$/.test(d.new_pin) ? 'الرقم ده سهل قوي. اختار رقم تاني.' : null) : 'الرقم الجديد 6 أرقام.',
      confirm: d.confirm === d.new_pin ? null : 'الرقمين مش زي بعض.'
    };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('a_pin', { old_pin: d.old_pin, new_pin: d.new_pin }));
    if (ok) {
      toast('الرقم السري اتغيّر');
      setD({ old_pin: '', new_pin: '', confirm: '' });
    }
  };
  return (
    <>
      <PageHeader title="غيّر الرقم السري" back="#a/more" />
      <Card>
        <Field label="الرقم الحالي" kind="digits" maxLength={6} value={d.old_pin} onInput={(x) => setD({ ...d, old_pin: x })} error={errors.old_pin} autoComplete="current-password" />
        <Field label="الرقم الجديد" kind="digits" maxLength={6} value={d.new_pin} onInput={(x) => setD({ ...d, new_pin: x })} error={errors.new_pin} autoComplete="new-password" />
        <Field label="اكتب الرقم الجديد تاني" kind="digits" maxLength={6} value={d.confirm} onInput={(x) => setD({ ...d, confirm: x })} error={errors.confirm} autoComplete="new-password" />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          غيّر
        </Button>
      </Card>
    </>
  );
}

/* ================= بيانات العمارة ================= */

function BuildingSettings() {
  const { admin: v } = useAppState();
  const b = v?.building;
  const [d, setD] = useState({ payment_info: b?.payment_info ?? '', treasurer_phone: b?.treasurer_phone ?? '', treasurer_email: b?.treasurer_email ?? '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  const submit = async () => {
    const e = { treasurer_phone: phoneError(d.treasurer_phone, false), treasurer_email: emailError(d.treasurer_email) };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('a_building', { payment_info: d.payment_info.trim(), treasurer_phone: onlyDigits(d.treasurer_phone), treasurer_email: d.treasurer_email.trim() }));
    if (ok) {
      toast('اتحفظ');
      refreshView().catch(() => {});
    }
  };
  return (
    <>
      <PageHeader title="بيانات الدفع والتواصل" back="#a/more" subtitle="دي اللي السكان بيشوفوها في صفحة الدفع." />
      <Card>
        <Field label="بيانات التحويل" hint="عنوان إنستاباي أو رقم المحفظة أو الحساب البنكي، واسم صاحبه." kind="textarea" value={d.payment_info} onInput={(x) => setD({ ...d, payment_info: x })} />
        <Field label="موبايل أمين الصندوق" kind="phone" maxLength={11} value={d.treasurer_phone} onInput={(x) => setD({ ...d, treasurer_phone: x })} error={errors.treasurer_phone} />
        <Field label="إيميل أمين الصندوق" hint="بيوصله ملخص كل أسبوع باللي محتاج متابعة." kind="email" value={d.treasurer_email} onInput={(x) => setD({ ...d, treasurer_email: x })} error={errors.treasurer_email} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          احفظ
        </Button>
      </Card>
    </>
  );
}

function GroupMessage() {
  const { admin: v } = useAppState();
  if (!v) return <CardSkeleton />;
  return (
    <>
      <PageHeader title="رسالة جروب العمارة" back="#a/more" subtitle="كشف حساب الشهر، جاهز تبعته." />
      <Card>
        <ShareBox text={v.group_message} />
      </Card>
    </>
  );
}
