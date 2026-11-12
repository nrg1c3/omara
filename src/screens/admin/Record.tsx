import { useState } from 'preact/hooks';
import { call, type ReceiptReading } from '../../api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { DateField, SelectField, Toggle } from '../../components/Form';
import { CardSkeleton } from '../../components/Loading';
import { Alert, ErrorMessage } from '../../components/Messages';
import { PageHeader } from '../../components/Page';
import { ReceiptPicker } from '../../components/Receipt';
import { ShareBox } from '../../components/ShareBox';
import { toast } from '../../components/Toast';
import { useDraft } from '../../lib/draft';
import { currentMonth, formatMoney, formatNumber, today, formatDate } from '../../lib/format';
import { useAction } from '../../lib/useAction';
import { amountError, amountValue, hasErrors, req } from '../../lib/validate';
import { refreshView, useAppState } from '../../store';

type Kind = 'payment' | 'expense' | 'correction' | 'opening';
const TABS: [Kind, string, string][] = [
  ['payment', 'دفعة', '#a/record'],
  ['expense', 'مصروف', '#a/record/expense'],
  ['correction', 'تصحيح', '#a/record/correction'],
  ['opening', 'رصيد أول', '#a/record/opening']
];
const FALLBACK_METHODS = ['كاش مع أمين الصندوق', 'إنستاباي', 'تحويل بنكي', 'محفظة موبايل'];
const FALLBACK_CATS = ['صيانة', 'أسانسير', 'كهرباء ومياه', 'نظافة', 'أمن وحراسة', 'مرتبات', 'خامات ومستلزمات', 'رسوم حكومية', 'أخرى'];

export function Record({ sub }: { sub?: string }) {
  const kind: Kind = sub === 'expense' || sub === 'correction' || sub === 'opening' ? sub : 'payment';
  return (
    <>
      <PageHeader title="تسجيل" subtitle="كل حاجة بتتسجل بإيصالها، وما بتتمسحش." />
      <div class="segmented" role="tablist" aria-label="نوع التسجيل">
        {TABS.map(([k, l, h]) => (
          <a key={k} href={h} role="tab" class="segmented__item" aria-selected={kind === k} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none', fontSize: '15px' }}>
            {l}
          </a>
        ))}
      </div>
      {kind === 'payment' && <PaymentForm />}
      {kind === 'expense' && <ExpenseForm />}
      {kind === 'correction' && <CorrectionForm />}
      {kind === 'opening' && <OpeningForm />}
    </>
  );
}

/* ================= دفعة ================= */

function PaymentForm() {
  const { admin: v } = useAppState();
  const [d, setD, clear] = useDraft('a_pay', { unit: '', amount: '', allocate: true, month: currentMonth(), method: 'كاش مع أمين الصندوق', paid_on: today(), reference: '' });
  const [reading, setReading] = useState<ReceiptReading | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<{ receipt_text: string; wa: string; unit: string } | null>(null);
  const act = useAction();
  if (!v) return <CardSkeleton />;
  const unit = v.units.find((u) => u.unit === d.unit);
  const methods = v.methods?.length ? v.methods : FALLBACK_METHODS;

  if (result) {
    const phone = v.units.find((u) => u.unit === result.unit)?.phone;
    return (
      <Card>
        <Alert tone="success">الدفعة اتسجلت.</Alert>
        {result.wa ? (
          <>
            <div class="pre">{result.receipt_text}</div>
            <a class="btn btn--primary btn--block" href={result.wa} target="_blank" rel="noopener">
              ابعت الإيصال للساكن واتساب
            </a>
          </>
        ) : (
          <ShareBox text={result.receipt_text} phone={phone} title="ابعت الإيصال للساكن" />
        )}
        <Button variant="secondary" block onClick={() => setResult(null)}>
          سجّل دفعة تانية
        </Button>
      </Card>
    );
  }

  const submit = async () => {
    const e = {
      unit: req(d.unit, 'اختار الشقة.'),
      amount: amountError(d.amount),
      month: d.allocate ? null : req(d.month, 'اختار الشهر.'),
      method: req(d.method, 'اختار طريقة الدفع.'),
      paid_on: req(d.paid_on, 'اختار يوم الدفع.')
    };
    setErrors(e);
    if (hasErrors(e)) return;
    const r = await act.run(() =>
      call('a_pay', {
        unit: d.unit,
        amount: amountValue(d.amount),
        allocate: d.allocate,
        ...(d.allocate ? {} : { month: d.month }),
        method: d.method,
        paid_on: d.paid_on,
        reference: d.reference.trim(),
        ...(reading ? { receipt_id: reading.receipt_id, ai_amount: reading.amount ?? null, ai_note: reading.note ?? null } : {})
      })
    );
    if (r) {
      setResult({ receipt_text: r.receipt_text, wa: r.wa, unit: d.unit });
      clear();
      setReading(null);
      refreshView().catch(() => {});
    }
  };

  return (
    <Card>
      <SelectField
        label="الشقة"
        value={d.unit}
        onChange={(x) => {
          const u = v.units.find((y) => y.unit === x);
          setD({ unit: x, amount: d.amount || (u?.balance_due ? String(u.balance_due) : '') });
        }}
        options={v.units.map((u) => ({ value: u.unit, label: `شقة ${u.unit}${u.owner_name ? ` · ${u.owner_name}` : ''}${u.balance_due ? ` (عليها ${formatNumber(u.balance_due)})` : ''}` }))}
        error={errors.unit}
      />
      {unit?.unpaid && unit.unpaid.length > 0 && <span class="muted">عليها: {unit.unpaid.map((m) => `${m.label} (${formatNumber(m.remaining)})`).join('، ')}</span>}
      <Field label="المبلغ (جنيه)" kind="amount" value={d.amount} onInput={(x) => setD({ amount: x })} error={errors.amount} />
      <Toggle label="وزّعها على الشهور المتأخرة" hint="الأقدم الأول، والزيادة بتتحسب رصيد للشقة." checked={d.allocate} onChange={(x) => setD({ allocate: x })} />
      {!d.allocate && <DateField type="month" label="عن شهر" value={d.month} onChange={(x) => setD({ month: x })} error={errors.month} />}
      <SelectField label="طريقة الدفع" value={d.method} onChange={(x) => setD({ method: x })} options={methods} error={errors.method} />
      <DateField label="يوم الدفع" value={d.paid_on} onChange={(x) => setD({ paid_on: x })} error={errors.paid_on} />
      <Field label="رقم العملية (لو تحويل)" kind="code" value={d.reference} onInput={(x) => setD({ reference: x })} />
      <span class="field__label">الإيصال (اختياري)</span>
      <ReceiptPicker
        kind="payment"
        unit={d.unit || undefined}
        reading={reading}
        onRead={(r) => {
          setReading(r);
          setD({ amount: r.amount ? String(r.amount) : d.amount, reference: r.reference || d.reference, paid_on: r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : d.paid_on });
        }}
        onClear={() => setReading(null)}
      />
      <ErrorMessage error={act.error} />
      <Button block loading={act.busy} onClick={submit}>
        سجّل الدفعة
      </Button>
    </Card>
  );
}

/* ================= مصروف ================= */

function ExpenseForm() {
  const { admin: v } = useAppState();
  const [d, setD, clear] = useDraft('a_expense', { item: '', category: '', vendor: '', amount: '', entry_date: today() });
  const [reading, setReading] = useState<ReceiptReading | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  if (!v) return <CardSkeleton />;
  const cats = v.expense_categories?.length ? v.expense_categories : FALLBACK_CATS;

  const submit = async () => {
    const e = { item: req(d.item, 'اكتب المصروف، زي: صيانة الأسانسير.'), category: req(d.category, 'اختار النوع.'), amount: amountError(d.amount), entry_date: req(d.entry_date, 'اختار التاريخ.') };
    setErrors(e);
    if (hasErrors(e)) return;
    if (!reading && !confirm('هتسجّل مصروف من غير إيصال، وهيبان للسكان إنه "من غير إيصال". تكمّل؟')) return;
    const ok = await act.run(() =>
      call('a_expense', { kind: 'expense', item: d.item.trim(), category: d.category, vendor: d.vendor.trim(), amount: amountValue(d.amount), entry_date: d.entry_date, ...(reading ? { receipt_id: reading.receipt_id } : {}) })
    );
    if (ok) {
      toast(`المصروف اتسجل: ${formatMoney(amountValue(d.amount))}`);
      clear();
      setReading(null);
      refreshView().catch(() => {});
    }
  };

  return (
    <Card>
      <ReceiptPicker
        kind="expense"
        label="صوّر الفاتورة، والبيانات هتتملي لوحدها"
        reading={reading}
        onRead={(r) => {
          setReading(r);
          setD({
            item: r.item || d.item,
            vendor: r.vendor || d.vendor,
            amount: r.amount ? String(r.amount) : d.amount,
            category: r.category && cats.includes(r.category) ? r.category : d.category,
            entry_date: r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : d.entry_date
          });
        }}
        onClear={() => setReading(null)}
      />
      <Field label="المصروف" value={d.item} onInput={(x) => setD({ item: x })} error={errors.item} />
      <SelectField label="النوع" value={d.category} onChange={(x) => setD({ category: x })} options={cats} error={errors.category} />
      <Field label="اتدفع لمين (اختياري)" value={d.vendor} onInput={(x) => setD({ vendor: x })} />
      <Field label="المبلغ (جنيه)" kind="amount" value={d.amount} onInput={(x) => setD({ amount: x })} error={errors.amount} />
      <DateField label="التاريخ" value={d.entry_date} onChange={(x) => setD({ entry_date: x })} error={errors.entry_date} />
      <ErrorMessage error={act.error} />
      <Button block loading={act.busy} onClick={submit}>
        سجّل المصروف
      </Button>
    </Card>
  );
}

/* ================= تصحيح ================= */

function CorrectionForm() {
  const { admin: v } = useAppState();
  const [d, setD] = useState({ corrects: '', amount: '', reason: '', entry_date: today() });
  const [reading, setReading] = useState<ReceiptReading | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  if (!v) return <CardSkeleton />;
  const entries = v.ledger.filter((e) => !e.corrects);
  const orig = entries.find((e) => String(e.no) === d.corrects);

  const submit = async () => {
    const e = {
      corrects: req(d.corrects, 'اختار القيد اللي عايز تصححه.'),
      amount: amountError(d.amount, { allowNegative: true }),
      reason: req(d.reason, 'اكتب سبب التصحيح، زي: الفاتورة الحقيقية 800 مش 900.')
    };
    setErrors(e);
    if (hasErrors(e) || !orig) return;
    const ok = await act.run(() =>
      call('a_expense', {
        kind: 'correction',
        item: `تصحيح ${orig.item}`,
        category: orig.category,
        vendor: orig.vendor || '',
        amount: amountValue(d.amount),
        entry_date: d.entry_date,
        corrects_entry: orig.no,
        reason: d.reason.trim(),
        ...(reading ? { receipt_id: reading.receipt_id } : {})
      })
    );
    if (ok) {
      toast('التصحيح اتسجل');
      setD({ corrects: '', amount: '', reason: '', entry_date: today() });
      setReading(null);
      refreshView().catch(() => {});
    }
  };

  return (
    <Card>
      <Alert tone="info">القيد القديم ما بيتمسحش. التصحيح بيتسجل قيد جديد ظاهر للسكان بالسبب.</Alert>
      <SelectField label="القيد اللي فيه غلط" value={d.corrects} onChange={(x) => setD({ ...d, corrects: x })} options={entries.map((e) => ({ value: String(e.no), label: `#${e.no} ${e.item} · ${formatNumber(e.amount)} · ${formatDate(e.date)}` }))} error={errors.corrects} />
      <Field label="الفرق (جنيه)" hint="بالسالب لو اتسجل زيادة، زي -100. وبالموجب لو اتسجل ناقص." kind="text" value={d.amount} onInput={(x) => setD({ ...d, amount: x })} error={errors.amount} />
      <Field label="السبب" kind="textarea" value={d.reason} onInput={(x) => setD({ ...d, reason: x })} error={errors.reason} />
      <DateField label="التاريخ" value={d.entry_date} onChange={(x) => setD({ ...d, entry_date: x })} />
      <span class="field__label">إيصال التصحيح (اختياري)</span>
      <ReceiptPicker kind="expense" reading={reading} onRead={(r) => setReading(r)} onClear={() => setReading(null)} />
      <ErrorMessage error={act.error} />
      <Button block loading={act.busy} onClick={submit}>
        سجّل التصحيح
      </Button>
    </Card>
  );
}

/* ================= رصيد افتتاحي ================= */

function OpeningForm() {
  const [d, setD] = useState({ amount: '', entry_date: today(), item: 'رصيد افتتاحي' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  const submit = async () => {
    const e = { amount: amountError(d.amount), item: req(d.item, 'اكتب وصف.') };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('a_expense', { kind: 'opening', item: d.item.trim(), category: 'أخرى', amount: amountValue(d.amount), entry_date: d.entry_date }));
    if (ok) {
      toast('الرصيد الافتتاحي اتسجل');
      setD({ amount: '', entry_date: today(), item: 'رصيد افتتاحي' });
      refreshView().catch(() => {});
    }
  };
  return (
    <Card>
      <p class="muted">الفلوس اللي كانت في الصندوق قبل ما تبدأ تستخدم التطبيق. سجّلها مرة واحدة.</p>
      <Field label="المبلغ (جنيه)" kind="amount" value={d.amount} onInput={(x) => setD({ ...d, amount: x })} error={errors.amount} />
      <DateField label="التاريخ" value={d.entry_date} onChange={(x) => setD({ ...d, entry_date: x })} />
      <Field label="الوصف" value={d.item} onInput={(x) => setD({ ...d, item: x })} error={errors.item} />
      <ErrorMessage error={act.error} />
      <Button block loading={act.busy} onClick={submit}>
        سجّل الرصيد
      </Button>
    </Card>
  );
}
