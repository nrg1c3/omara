import { useState } from 'preact/hooks';
import { call, type Claim } from '../../api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { ErrorMessage } from '../../components/Messages';
import { Badge, Empty, Row } from '../../components/Page';
import { ReceiptButton } from '../../components/Receipt';
import { ShareBox } from '../../components/ShareBox';
import { toast } from '../../components/Toast';
import { formatMoney, formatNumber, formatDate } from '../../lib/format';
import { waLink } from '../../lib/share';
import { useAction } from '../../lib/useAction';
import { amountError, amountValue } from '../../lib/validate';
import { buildingName } from '../../lib/view';
import { refreshView, useAppState } from '../../store';

export function isPendingClaim(c: Claim): boolean {
  return !c.status || /مستني|جديد|pending/i.test(String(c.status));
}

export function AdminHome() {
  const { admin: v } = useAppState();
  const [showGroup, setShowGroup] = useState(false);
  if (!v) return <CardSkeleton lines={3} />;
  const f = v.fund;
  const pending = v.claims.filter(isPendingClaim);
  const lateTotal = v.late.reduce((s, l) => s + Number(l.amount || 0), 0);
  const due = f.due_this_month ?? 0;
  const collected = f.collected_this_month ?? 0;

  return (
    <>
      <header class="stack" style={{ gap: '2px' }}>
        <h1 class="screen__title">لوحة الاتحاد</h1>
        <p class="screen__subtitle">
          {v.admin_name ? `${v.admin_name} · ` : ''}
          {buildingName(v.building)}
        </p>
      </header>

      <Card hero>
        <span style={{ opacity: 0.95 }}>تحصيل {f.month_label ?? 'الشهر ده'}</span>
        <span class="num" style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1.1 }} data-testid="collected">
          {formatNumber(collected)} <span style={{ fontSize: '16px', fontWeight: 500 }}>من {formatMoney(due)}</span>
        </span>
        <div class="progress" style={{ background: 'rgba(255,255,255,0.25)' }} role="progressbar" aria-label="نسبة التحصيل" aria-valuenow={due ? Math.round((collected / due) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
          <div class="progress__bar" style={{ width: `${due ? Math.min(100, (collected / due) * 100) : 0}%`, background: '#fff' }} />
        </div>
        <span>
          {formatNumber(f.paid_units)} شقة دفعت من {formatNumber(f.total_units)} · رصيد الصندوق {formatMoney(f.balance)}
        </span>
      </Card>

      <div class="grid-2">
        <a class="tile" href="#a/record">
          <Icon name="wallet" size={24} />
          <span>سجّل دفعة</span>
        </a>
        <a class="tile" href="#a/record/expense">
          <Icon name="receipt" size={24} />
          <span>سجّل مصروف</span>
        </a>
      </div>

      <h2 class="section-title">
        <span>تحويلات مستنية موافقتك</span>
        {pending.length > 0 && <Badge tone="warn">{formatNumber(pending.length)}</Badge>}
      </h2>
      {pending.length === 0 ? (
        <Empty icon="check">مفيش تحويلات مستنية.</Empty>
      ) : (
        <div class="list">
          {pending.map((c) => (
            <ClaimRow key={String(c.id)} c={c} />
          ))}
        </div>
      )}

      <h2 class="section-title">
        <span>المتأخرين</span>
        {lateTotal > 0 && <span style={{ color: 'var(--warn-ink)', fontSize: '16px' }}>إجمالي {formatMoney(lateTotal)}</span>}
      </h2>
      {v.late.length === 0 ? (
        <Empty icon="check">كل الشقق دافعة. برافو.</Empty>
      ) : (
        <div class="list">
          {v.late.map((l) => (
            <Row key={l.unit} title={`شقة ${l.unit}${l.owner_name ? ` · ${l.owner_name}` : ''}`} meta={l.months_text} value={formatMoney(l.amount)} badge={l.months ? <Badge tone="warn">متأخر {formatNumber(l.months)} شهر</Badge> : undefined}>
              <div class="list-row__actions">
                <a class="btn btn--secondary" href={l.wa || waLink(l.text, l.phone)} target="_blank" rel="noopener">
                  <Icon name="send" size={20} />
                  <span>فكّره على واتساب</span>
                </a>
              </div>
              {!l.phone && <span class="muted">مفيش رقم متسجل للشقة دي، هتختار جهة الاتصال من واتساب.</span>}
            </Row>
          ))}
        </div>
      )}

      <Card>
        <div class="section-title">
          <span>رسالة جروب العمارة</span>
          <Button variant="ghost" onClick={() => setShowGroup(!showGroup)}>
            {showGroup ? 'اخفيها' : 'شوفها'}
          </Button>
        </div>
        {showGroup ? <ShareBox text={v.group_message} /> : <span class="muted">كشف حساب الشهر جاهز تبعته للجروب.</span>}
      </Card>

      {v.open_tickets > 0 && (
        <a class="alert alert--warn" href="#a/requests" style={{ textDecoration: 'none' }}>
          <Icon name="wrench" size={20} />
          <span>فيه {formatNumber(v.open_tickets)} عطل مفتوح.</span>
        </a>
      )}
    </>
  );
}

function ClaimRow({ c }: { c: Claim }) {
  const [amount, setAmount] = useState(String(c.amount ?? ''));
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const act = useAction();
  const aiDiff = c.ai_amount !== undefined && c.ai_amount !== null && Number(c.ai_amount) !== Number(c.amount);

  const decide = async (decision: 'accept' | 'reject') => {
    if (decision === 'accept') {
      const e = amountError(amount);
      setErr(e);
      if (e) return;
    } else if (!note.trim()) {
      setErr('اكتب سبب الرفض عشان الساكن يعرف يصلّح إيه.');
      return;
    }
    setErr(null);
    const ok = await act.run(() => call('a_claim', { id: c.id, decision, note: note.trim(), ...(decision === 'accept' ? { amount: amountValue(amount) } : {}) }));
    if (ok) {
      toast(decision === 'accept' ? 'اتقبل واتسجّل' : 'اترفض');
      refreshView().catch(() => {});
    }
  };

  return (
    <Row title={`شقة ${c.unit ?? ''} · ${c.label || c.month || ''}`} meta={[c.method, formatDate(c.paid_on), c.reference || c.ref ? `رقم العملية ${c.reference || c.ref}` : ''].filter(Boolean).join(' · ')} value={c.amount !== undefined ? formatMoney(c.amount) : undefined}>
      {aiDiff && (
        <span class="badge badge--warn" style={{ alignSelf: 'flex-start' }}>
          <Icon name="alert" size={16} /> الإيصال مكتوب فيه {formatMoney(Number(c.ai_amount))}
        </span>
      )}
      {c.ai_note && <span class="muted">ملاحظة القراءة: {c.ai_note}</span>}
      {c.receipt_id && (
        <div class="list-row__actions">
          <ReceiptButton receiptId={c.receipt_id} />
        </div>
      )}
      <Field label="المبلغ اللي هيتسجّل" kind="amount" value={amount} onInput={setAmount} />
      <Field label="ملاحظة (مطلوبة لو هترفض)" value={note} onInput={setNote} />
      <ErrorMessage error={err || act.error} />
      <div class="list-row__actions">
        <Button loading={act.busy} icon="check" onClick={() => decide('accept')}>
          وافق
        </Button>
        <Button variant="secondary" disabled={act.busy} icon="close" onClick={() => decide('reject')}>
          ارفض
        </Button>
      </div>
    </Row>
  );
}
