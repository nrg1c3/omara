import { useState } from 'preact/hooks';
import { call, type ServiceRequest, type ServiceStatus, type Ticket, type TicketStatus } from '../../api';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Choice } from '../../components/Form';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { ErrorMessage } from '../../components/Messages';
import { Badge, Empty, PageHeader, Row } from '../../components/Page';
import { ReceiptButton } from '../../components/Receipt';
import { toast } from '../../components/Toast';
import { ticketTone } from '../../lib/app';
import { formatMoney, formatDate } from '../../lib/format';
import { useAction } from '../../lib/useAction';
import { amountValue } from '../../lib/validate';
import { refreshView, useAppState } from '../../store';

const T_STATUSES: TicketStatus[] = ['جديد', 'جاري الشغل', 'اتحل'];
const S_STATUSES: ServiceStatus[] = ['جديد', 'اتواصل مع الفني', 'اتنفذ', 'اتلغى'];

export function AdminRequests({ sub }: { sub?: string }) {
  const { admin: v } = useAppState();
  const section = sub === 'services' ? 'services' : 'tickets';
  if (!v) return <CardSkeleton />;
  const open = v.tickets.filter((t) => t.status !== 'اتحل');
  const closed = v.tickets.filter((t) => t.status === 'اتحل');
  return (
    <>
      <PageHeader title="الطلبات" />
      <div class="segmented" role="tablist" aria-label="نوع الطلب">
        <a href="#a/requests" role="tab" class="segmented__item" aria-selected={section === 'tickets'} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
          أعطال ({open.length})
        </a>
        <a href="#a/requests/services" role="tab" class="segmented__item" aria-selected={section === 'services'} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
          صنايعية
        </a>
      </div>
      {section === 'tickets' ? (
        <>
          {open.length === 0 ? <Empty icon="check">مفيش أعطال مفتوحة.</Empty> : <div class="list">{open.map((t) => <TicketRow key={t.id} t={t} />)}</div>}
          {closed.length > 0 && (
            <details>
              <summary class="btn btn--ghost">الأعطال اللي اتحلت ({closed.length})</summary>
              <div class="list">
                {closed.map((t) => (
                  <Row key={t.id} title={t.issue} meta={[t.category, t.unit ? `شقة ${t.unit}` : '', formatDate(t.date)].filter(Boolean).join(' · ')} badge={<Badge tone="success">اتحل</Badge>}>
                    {t.resolution && <span class="muted">{t.resolution}</span>}
                  </Row>
                ))}
              </div>
            </details>
          )}
        </>
      ) : v.services.length === 0 ? (
        <Empty icon="tools">مفيش طلبات صنايعية.</Empty>
      ) : (
        <div class="list">
          {v.services.map((s) => (
            <ServiceRow key={s.id} s={s} />
          ))}
        </div>
      )}
    </>
  );
}

function TicketRow({ t }: { t: Ticket }) {
  const [status, setStatus] = useState<TicketStatus>(t.status);
  const [resolution, setResolution] = useState(t.resolution ?? '');
  const [err, setErr] = useState<string | null>(null);
  const act = useAction();
  const save = async () => {
    if (status === 'اتحل' && !resolution.trim()) {
      setErr('اكتب اتعمل إيه عشان السكان يعرفوا.');
      return;
    }
    setErr(null);
    const ok = await act.run(() => call('a_ticket', { id: t.id, status, resolution: resolution.trim() }));
    if (ok) {
      toast(status === 'اتحل' ? 'البلاغ اتقفل' : 'اتحفظ');
      refreshView().catch(() => {});
    }
  };
  return (
    <Row title={t.issue} meta={[t.category, t.unit ? `شقة ${t.unit}` : '', t.reporter, formatDate(t.date)].filter(Boolean).join(' · ')} badge={<Badge tone={ticketTone(t.status)}>{t.status}</Badge>}>
      {t.urgency === 'عاجل' && (
        <span style={{ color: 'var(--danger-ink)', fontWeight: 700 }}>
          <Icon name="alert" size={16} /> عاجل
        </span>
      )}
      {t.receipt_id && (
        <div class="list-row__actions">
          <ReceiptButton receiptId={t.receipt_id} label="شوف الصورة" />
        </div>
      )}
      <Choice<TicketStatus> label="الحالة" value={status} onChange={setStatus} options={T_STATUSES.map((s) => ({ value: s, label: s }))} />
      <Field label="اتعمل إيه؟" value={resolution} onInput={setResolution} />
      <ErrorMessage error={err || act.error} />
      <Button loading={act.busy} onClick={save}>
        احفظ
      </Button>
    </Row>
  );
}

function ServiceRow({ s }: { s: ServiceRequest }) {
  const [status, setStatus] = useState<ServiceStatus>(s.status);
  const [price, setPrice] = useState(s.price ? String(s.price) : '');
  const act = useAction();
  const save = async () => {
    const ok = await act.run(() => call('a_service', { id: s.id, status, ...(price.trim() ? { price: amountValue(price) } : {}) }));
    if (ok) {
      toast('اتحفظ');
      refreshView().catch(() => {});
    }
  };
  return (
    <Row title={`${s.trade}: ${s.description}`} meta={[s.unit ? `شقة ${s.unit}` : '', s.resident_name, s.preferred_time, formatDate(s.date)].filter(Boolean).join(' · ')} badge={<Badge tone={ticketTone(s.status)}>{s.status}</Badge>} value={s.price ? formatMoney(s.price) : undefined}>
      <div class="list-row__actions">
        {s.resident_phone && (
          <a class="btn btn--secondary" href={`tel:${s.resident_phone}`}>
            <Icon name="phone" size={20} />
            <span>الساكن</span>
          </a>
        )}
        {s.provider_phone && (
          <a class="btn btn--secondary" href={`tel:${s.provider_phone}`}>
            <Icon name="phone" size={20} />
            <span>الفني{s.provider_name ? `: ${s.provider_name}` : ''}</span>
          </a>
        )}
      </div>
      <Choice<ServiceStatus> label="الحالة" value={status} onChange={setStatus} options={S_STATUSES.map((x) => ({ value: x, label: x }))} />
      <Field label="السعر (جنيه)" kind="amount" value={price} onInput={setPrice} hint="عمولة NRG بتتحسب لوحدها." />
      <ErrorMessage error={act.error} />
      <Button loading={act.busy} onClick={save}>
        احفظ
      </Button>
    </Row>
  );
}
