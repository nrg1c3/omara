import { useState } from 'preact/hooks';
import { call, type ReceiptReading } from '../../api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { DateField, SelectField } from '../../components/Form';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { Alert, ErrorMessage } from '../../components/Messages';
import { Badge, Empty, PageHeader, Row } from '../../components/Page';
import { ReceiptButton, ReceiptPicker } from '../../components/Receipt';
import { formatMoney, formatNumber, today, formatDate } from '../../lib/format';
import { useAction } from '../../lib/useAction';
import { amountError, amountValue, hasErrors, req } from '../../lib/validate';
import { navigate } from '../../router';
import { refreshView, useAppState } from '../../store';

/** طرق التحويل (الكاش بيتسجل عند أمين الصندوق، مش من هنا) */
export const TRANSFER_METHODS = ['إنستاباي', 'تحويل بنكي', 'محفظة موبايل'];

export function Pay({ sub }: { sub?: string }) {
  if (sub === 'claim') return <ClaimForm />;
  return <PayHome />;
}

function claimTone(status?: string): 'warn' | 'success' | 'danger' | 'neutral' {
  const s = String(status ?? '');
  if (/اتقبل|مقبول|accept/i.test(s)) return 'success';
  if (/اترفض|مرفوض|reject/i.test(s)) return 'danger';
  if (!s || /مستني|جديد|pending/i.test(s)) return 'warn';
  return 'neutral';
}

function PayHome() {
  const { resident: v } = useAppState();
  if (!v) return <CardSkeleton lines={3} />;
  const due = v.account.balance_due;
  const b = v.building;
  return (
    <>
      <PageHeader title="الدفع" subtitle={due > 0 ? `عليك ${formatMoney(due)}` : 'مفيش عليك حاجة دلوقتي'} />

      {v.account.unpaid.length > 0 && (
        <div class="list" aria-label="الشهور اللي عليك">
          {v.account.unpaid.map((m) => (
            <Row key={m.month} title={m.label} meta={m.due_date ? `آخر ميعاد ${formatDate(m.due_date)}` : undefined} value={formatMoney(m.remaining)} badge={m.paid > 0 ? <Badge tone="warn">دافع جزء</Badge> : undefined} />
          ))}
        </div>
      )}

      <Card title="ادفع إزاي؟">
        <div class="stack" style={{ gap: '6px' }}>
          <strong>1. تحويل (إنستاباي أو بنك أو محفظة)</strong>
          {b.payment_info ? <div class="pre">{b.payment_info}</div> : <p class="muted">أمين الصندوق لسه ما كتبش بيانات التحويل. اسأله عليها.</p>}
          <span class="muted">بعد ما تحوّل، صوّر الإيصال وابعته من هنا.</span>
        </div>
        <div class="stack" style={{ gap: '6px' }}>
          <strong>2. كاش مع أمين الصندوق</strong>
          <span class="muted">
            ادفع لـ {b.treasurer_name || 'أمين الصندوق'} وهو هيسجّلها، وهيوصلك إيصال.
          </span>
          {b.treasurer_phone && (
            <a class="btn btn--secondary" href={`tel:${b.treasurer_phone}`}>
              <Icon name="phone" size={20} />
              <span class="ltr">{b.treasurer_phone}</span>
            </a>
          )}
        </div>
      </Card>

      <div class="sticky-action">
        <a class="btn btn--primary btn--block" href="#r/pay/claim">
          <Icon name="camera" size={20} />
          <span>حوّلت؟ ابعت الإيصال</span>
        </a>
      </div>

      {v.claims.length > 0 && (
        <>
          <h2 class="section-title">التحويلات اللي بعتها</h2>
          <div class="list">
            {v.claims.map((c) => (
              <Row key={String(c.id)} title={c.label || c.month || 'تحويل'} meta={[c.method, formatDate(c.paid_on || c.date)].filter(Boolean).join(' · ')} value={c.amount !== undefined ? formatMoney(c.amount) : undefined} badge={<Badge tone={claimTone(c.status)}>{c.status || 'مستني المراجعة'}</Badge>}>
                {c.note && <span class="muted">{c.note}</span>}
              </Row>
            ))}
          </div>
        </>
      )}

      <h2 class="section-title">اللي دفعته</h2>
      {v.payments.length === 0 ? (
        <Empty icon="wallet">لسه مفيش دفعات متسجلة.</Empty>
      ) : (
        <div class="list">
          {v.payments.map((p, i) => (
            <Row key={i} title={p.label || p.month} meta={[p.method, formatDate(p.paid_on)].filter(Boolean).join(' · ')} value={formatMoney(p.amount)}>
              {p.receipt_id && (
                <div class="list-row__actions">
                  <ReceiptButton receiptId={p.receipt_id} />
                </div>
              )}
            </Row>
          ))}
        </div>
      )}
    </>
  );
}

function ClaimForm() {
  const { resident: v } = useAppState();
  const [reading, setReading] = useState<ReceiptReading | null>(null);
  const [f, setF] = useState({ amount: '', month: '', method: '', paid_on: today(), reference: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [done, setDone] = useState(false);
  const act = useAction();

  if (!v) return <CardSkeleton />;
  const monthOptions = [...v.account.unpaid, ...v.account.months]
    .filter((m, i, arr) => arr.findIndex((x) => x.month === m.month) === i)
    .map((m) => ({ value: m.month, label: `${m.label}${m.remaining > 0 ? ` (باقي ${formatNumber(m.remaining)})` : ''}` }));

  const onRead = (r: ReceiptReading) => {
    setReading(r);
    setF((s) => ({
      amount: r.amount ? String(r.amount) : s.amount || (v.account.unpaid[0] ? String(v.account.unpaid[0].remaining) : ''),
      month: (r.suggested_month && monthOptions.some((o) => o.value === r.suggested_month) ? r.suggested_month : '') || s.month || v.account.unpaid[0]?.month || '',
      method: TRANSFER_METHODS.find((m) => r.method && r.method.includes(m.split(' ')[0])) || s.method || 'إنستاباي',
      paid_on: r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : s.paid_on,
      reference: r.reference || s.reference
    }));
  };

  if (done) {
    return (
      <>
        <PageHeader title="اتبعت" back="#r/pay" />
        <Alert tone="success">التحويل اتبعت لأمين الصندوق. أول ما يوافق عليه، حسابك هيتحدّث.</Alert>
        <a class="btn btn--primary btn--block" href="#r/home">
          رجوع للرئيسية
        </a>
      </>
    );
  }

  const submit = async () => {
    const e = {
      receipt: reading ? null : 'ارفع صورة إيصال التحويل الأول.',
      amount: amountError(f.amount),
      month: req(f.month, 'اختار الشهر اللي بتدفعه.'),
      method: req(f.method, 'اختار طريقة التحويل.'),
      paid_on: req(f.paid_on, 'اختار يوم التحويل.'),
      reference: req(f.reference, 'اكتب رقم العملية. هتلاقيه في رسالة التحويل.')
    };
    setErrors(e);
    if (hasErrors(e) || !reading) return;
    const ok = await act.run(() =>
      call('r_claim', {
        receipt_id: reading.receipt_id,
        amount: amountValue(f.amount),
        month: f.month,
        method: f.method,
        paid_on: f.paid_on,
        reference: f.reference.trim(),
        ai_amount: reading.amount ?? null,
        ai_note: reading.note ?? null
      })
    );
    if (ok) {
      setDone(true);
      refreshView().catch(() => {});
    }
  };

  return (
    <>
      <PageHeader title="ابعت إيصال التحويل" back="#r/pay" />
      <ReceiptPicker
        kind="claim"
        reading={reading}
        onRead={onRead}
        onClear={() => setReading(null)}
        label="صوّر إيصال التحويل أو اختار سكرين شوت"
        error={errors.receipt}
      />
      {reading && (
        <Card>
          <Field label="المبلغ (جنيه)" kind="amount" value={f.amount} onInput={(x) => setF({ ...f, amount: x })} error={errors.amount} />
          <SelectField label="عن شهر" value={f.month} onChange={(x) => setF({ ...f, month: x })} options={monthOptions} error={errors.month} />
          <SelectField label="طريقة التحويل" value={f.method} onChange={(x) => setF({ ...f, method: x })} options={TRANSFER_METHODS} error={errors.method} />
          <DateField label="يوم التحويل" value={f.paid_on} onChange={(x) => setF({ ...f, paid_on: x })} error={errors.paid_on} />
          <Field label="رقم العملية" kind="code" value={f.reference} onInput={(x) => setF({ ...f, reference: x })} error={errors.reference} />
          <ErrorMessage error={act.error} />
          <Button block loading={act.busy} onClick={submit}>
            ابعت لأمين الصندوق
          </Button>
        </Card>
      )}
      {!reading && (
        <Button variant="ghost" onClick={() => navigate('#r/pay')}>
          إلغاء
        </Button>
      )}
    </>
  );
}
