import { useState } from 'preact/hooks';
import type { LedgerEntry } from '../../api';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { Badge, Empty, PageHeader, Row } from '../../components/Page';
import { ReceiptButton } from '../../components/Receipt';
import { formatMoney, formatMonth, formatDate } from '../../lib/format';
import { useAppState } from '../../store';

/** قيود الدفتر بالشهر (الأحدث الأول) */
export function groupByMonth(entries: LedgerEntry[]): [string, LedgerEntry[]][] {
  const m = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const k = (e.date || '').slice(0, 7) || 'بدون تاريخ';
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e);
  }
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function LedgerEntryRow({ e, all }: { e: LedgerEntry; all: LedgerEntry[] }) {
  const isCorrection = !!e.corrects;
  const corrected = all.filter((x) => x.corrects && String(x.corrects) === String(e.no));
  const meta = [e.category, e.vendor, formatDate(e.date)].filter(Boolean).join(' · ');
  return (
    <Row
      title={
        <>
          <span class="muted num" style={{ fontWeight: 400 }}>
            #{e.no}{' '}
          </span>
          {e.item}
        </>
      }
      meta={meta}
      value={formatMoney(e.amount)}
      badge={isCorrection ? <Badge tone="warn">تصحيح</Badge> : e.has_receipt ? <Badge tone="success">بإيصال</Badge> : <Badge tone="neutral">من غير إيصال</Badge>}
    >
      {isCorrection && (
        <span class="muted">
          بيصحح قيد #{e.corrects}
          {e.reason ? `: ${e.reason}` : ''}
        </span>
      )}
      {corrected.length > 0 && <span class="muted">القيد ده عليه تصحيح ({corrected.map((c) => `#${c.no}`).join('، ')}).</span>}
      {e.receipt_id && (
        <div class="list-row__actions">
          <ReceiptButton receiptId={e.receipt_id} />
        </div>
      )}
    </Row>
  );
}

export function Ledger() {
  const { resident, admin } = useAppState();
  const v = resident || admin;
  const [month, setMonth] = useState<string>('all');
  if (!v) return <CardSkeleton lines={4} />;
  const groups = groupByMonth(v.ledger ?? []);
  const shown = month === 'all' ? groups : groups.filter(([k]) => k === month);
  const fund = v.fund;

  return (
    <>
      <PageHeader title="دفتر العمارة" subtitle="كل مصروف بإيصاله. الدفتر ما بيتعدّلش، وأي غلط بيتصلح بقيد تصحيح ظاهر للكل." />
      <div class="grid-2">
        <Card>
          <span class="muted">رصيد الصندوق</span>
          <span class="num big-num" style={{ fontSize: '22px' }}>
            {formatMoney(fund.balance)}
          </span>
        </Card>
        <Card>
          <span class="muted">اتصرف الشهر ده</span>
          <span class="num big-num" style={{ fontSize: '22px' }}>
            {formatMoney(fund.spent_this_month)}
          </span>
        </Card>
      </div>

      {fund.expense_months?.length > 0 && (
        <div class="list" aria-label="المصاريف بالشهر">
          {fund.expense_months.map((m) => (
            <Row key={m.month} title={m.label} value={formatMoney(m.total)} />
          ))}
        </div>
      )}

      {groups.length > 1 && (
        <div class="choice__row" role="group" aria-label="اختار الشهر">
          <button type="button" class="choice__item" aria-pressed={month === 'all'} onClick={() => setMonth('all')}>
            الكل
          </button>
          {groups.map(([k]) => (
            <button key={k} type="button" class="choice__item" aria-pressed={month === k} onClick={() => setMonth(k)}>
              {formatMonth(k)}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <Empty icon="receipt">لسه مفيش مصاريف متسجلة.</Empty>
      ) : (
        shown.map(([k, entries]) => (
          <section key={k} class="stack">
            <h2 class="section-title">
              <span>{formatMonth(k)}</span>
              <span class="num muted" style={{ fontWeight: 600 }}>
                {formatMoney(entries.reduce((s, e) => s + Number(e.amount || 0), 0))}
              </span>
            </h2>
            <div class="list">
              {entries.map((e) => (
                <LedgerEntryRow key={e.no} e={e} all={v.ledger} />
              ))}
            </div>
          </section>
        ))
      )}
      <p class="muted" style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
        <Icon name="shield" size={20} />
        <span>أي ساكن يقدر يشوف الدفتر ده. ده بيحمي الاتحاد وأمين الصندوق قدام الملاك.</span>
      </p>
    </>
  );
}
