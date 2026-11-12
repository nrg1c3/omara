import { useEffect, useState } from 'preact/hooks';
import { call, type ReceiptReading, type Ticket, type TicketUrgency } from '../../api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Choice, DateField, SelectField } from '../../components/Form';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { Alert, ErrorMessage } from '../../components/Messages';
import { Badge, Empty, PageHeader, Row } from '../../components/Page';
import { ReceiptPicker } from '../../components/Receipt';
import { ShareBox } from '../../components/ShareBox';
import { ticketTone } from '../../lib/app';
import { useDraft } from '../../lib/draft';
import { formatMoney, today, formatDate } from '../../lib/format';
import { useAction } from '../../lib/useAction';
import { hasErrors, phoneError, req } from '../../lib/validate';
import { onlyDigits } from '../../lib/digits';
import { refreshView, refreshX, useAppState } from '../../store';

const FALLBACK_TICKET_CATS = ['أسانسير', 'سباكة ومياه', 'كهرباء', 'نظافة', 'أمن وبوابة', 'أخرى'];
const FALLBACK_TRADES = ['سباكة', 'كهرباء', 'نجارة', 'تكييف', 'نقاشة ودهانات', 'أخرى'];

export function Requests({ sub }: { sub?: string }) {
  if (sub === 'new-ticket') return <TicketForm />;
  if (sub === 'new-service') return <ServiceForm />;
  if (sub === 'new-visitor') return <VisitorForm />;
  const section = sub === 'services' ? 'services' : sub === 'visitors' ? 'visitors' : 'tickets';
  return (
    <>
      <PageHeader title="الطلبات" />
      <div class="segmented" role="tablist" aria-label="نوع الطلب">
        {(
          [
            ['tickets', 'أعطال', '#r/requests'],
            ['services', 'صنايعي', '#r/requests/services'],
            ['visitors', 'زوار', '#r/requests/visitors']
          ] as const
        ).map(([k, l, h]) => (
          <a key={k} href={h} role="tab" class="segmented__item" aria-selected={section === k} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
            {l}
          </a>
        ))}
      </div>
      {section === 'tickets' && <Tickets />}
      {section === 'services' && <Services />}
      {section === 'visitors' && <Visitors />}
    </>
  );
}

function Tickets() {
  const { resident: v } = useAppState();
  if (!v) return <CardSkeleton />;
  const mine = v.tickets.filter((t) => t.mine);
  const others = v.tickets.filter((t) => !t.mine);
  return (
    <>
      <a class="btn btn--primary btn--block" href="#r/requests/new-ticket">
        <Icon name="wrench" size={20} />
        <span>بلّغ عن عطل</span>
      </a>
      {v.tickets.length === 0 && <Empty icon="wrench">مفيش أعطال متبلّغ عنها.</Empty>}
      {mine.length > 0 && <h2 class="section-title">بلاغاتي</h2>}
      {mine.length > 0 && <TicketList items={mine} />}
      {others.length > 0 && <h2 class="section-title">أعطال العمارة</h2>}
      {others.length > 0 && <TicketList items={others} />}
    </>
  );
}

export function TicketList({ items }: { items: Ticket[] }) {
  return (
    <div class="list">
      {items.map((t) => (
        <Row key={t.id} title={t.issue} meta={[t.category, formatDate(t.date)].filter(Boolean).join(' · ')} badge={<Badge tone={ticketTone(t.status)}>{t.status}</Badge>}>
          {t.urgency === 'عاجل' && (
            <span style={{ color: 'var(--danger-ink)', fontWeight: 600 }}>
              <Icon name="alert" size={16} /> عاجل
            </span>
          )}
          {t.resolution && <span class="muted">اللي اتعمل: {t.resolution}</span>}
        </Row>
      ))}
    </div>
  );
}

function TicketForm() {
  const { resident: v } = useAppState();
  const [d, setD, clear] = useDraft('ticket', { category: '', issue: '', urgency: 'عادي' as TicketUrgency });
  const [reading, setReading] = useState<ReceiptReading | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [done, setDone] = useState(false);
  const act = useAction();
  const cats = v?.ticket_categories?.length ? v.ticket_categories : FALLBACK_TICKET_CATS;

  if (done)
    return (
      <>
        <PageHeader title="البلاغ اتبعت" back="#r/requests" />
        <Alert tone="success">أمين الصندوق وصله البلاغ. هتلاقي حالته في صفحة الطلبات.</Alert>
        <a class="btn btn--primary btn--block" href="#r/requests">
          شوف بلاغاتي
        </a>
      </>
    );

  const submit = async () => {
    const e = { category: req(d.category, 'اختار نوع العطل.'), issue: req(d.issue, 'اكتب العطل في سطر، زي: الأسانسير واقف في الدور الرابع.') };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('r_ticket', { category: d.category, issue: d.issue.trim(), urgency: d.urgency, ...(reading ? { receipt_id: reading.receipt_id } : {}) }));
    if (ok) {
      clear();
      setDone(true);
      refreshView().catch(() => {});
    }
  };

  return (
    <>
      <PageHeader title="بلّغ عن عطل" back="#r/requests" />
      <Card>
        <SelectField label="نوع العطل" value={d.category} onChange={(x) => setD({ category: x })} options={cats} error={errors.category} />
        <Field label="إيه اللي حصل؟" kind="textarea" value={d.issue} onInput={(x) => setD({ issue: x })} error={errors.issue} maxLength={500} />
        <Choice<TicketUrgency>
          label="مستعجل؟"
          value={d.urgency}
          onChange={(x) => setD({ urgency: x })}
          options={[
            { value: 'عادي', label: 'عادي' },
            { value: 'عاجل', label: 'عاجل' }
          ]}
        />
        <span class="field__label">صورة للعطل (اختياري)</span>
        <ReceiptPicker kind="ticket" label="صوّر العطل" reading={reading} onRead={(r) => setReading(r)} onClear={() => setReading(null)} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          ابعت البلاغ
        </Button>
      </Card>
    </>
  );
}

function Services() {
  const { resident: v } = useAppState();
  if (!v) return <CardSkeleton />;
  return (
    <>
      <Card>
        <p>محتاج سبّاك أو كهربائي أو نجّار في شقتك؟ NRG بتبعتلك فني متراجع وبسعر واضح قبل الشغل.</p>
        <a class="btn btn--primary btn--block" href="#r/requests/new-service">
          <Icon name="tools" size={20} />
          <span>اطلب صنايعي</span>
        </a>
      </Card>
      {v.services.length === 0 ? (
        <Empty icon="tools">ما طلبتش صنايعي قبل كده.</Empty>
      ) : (
        <div class="list">
          {v.services.map((s) => (
            <Row key={s.id} title={`${s.trade}: ${s.description}`} meta={[s.preferred_time, formatDate(s.date)].filter(Boolean).join(' · ')} badge={<Badge tone={ticketTone(s.status)}>{s.status}</Badge>} value={s.price ? formatMoney(s.price) : undefined}>
              {s.provider_name && (
                <div class="list-row__actions">
                  <span class="muted">الفني: {s.provider_name}</span>
                  {s.provider_phone && (
                    <a class="btn btn--secondary" href={`tel:${s.provider_phone}`}>
                      <Icon name="phone" size={20} />
                      <span>كلّمه</span>
                    </a>
                  )}
                </div>
              )}
            </Row>
          ))}
        </div>
      )}
    </>
  );
}

function ServiceForm() {
  const { resident: v } = useAppState();
  const [d, setD, clear] = useDraft('service', { trade: '', description: '', preferred_time: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [done, setDone] = useState(false);
  const act = useAction();
  const trades = v?.trades?.length ? v.trades : FALLBACK_TRADES;

  if (done)
    return (
      <>
        <PageHeader title="الطلب اتبعت" back="#r/requests/services" />
        <Alert tone="success">هنكلّمك على الموبايل نتفق على الميعاد والسعر قبل ما الفني ييجي.</Alert>
        <a class="btn btn--primary btn--block" href="#r/requests/services">
          شوف طلباتي
        </a>
      </>
    );

  const submit = async () => {
    const e = {
      trade: req(d.trade, 'اختار نوع الشغل.'),
      description: req(d.description, 'اكتب المطلوب في سطر، زي: حنفية المطبخ بتنقط.'),
      preferred_time: req(d.preferred_time, 'اكتب الوقت اللي يناسبك، زي: بكرة بعد العصر.'),
      phone: phoneError(d.phone)
    };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('r_service', { trade: d.trade, description: d.description.trim(), preferred_time: d.preferred_time.trim(), phone: onlyDigits(d.phone) }));
    if (ok) {
      clear();
      setDone(true);
      refreshView().catch(() => {});
    }
  };

  return (
    <>
      <PageHeader title="اطلب صنايعي" back="#r/requests/services" />
      <Card>
        <SelectField label="نوع الشغل" value={d.trade} onChange={(x) => setD({ trade: x })} options={trades} error={errors.trade} />
        <Field label="محتاج إيه؟" kind="textarea" value={d.description} onInput={(x) => setD({ description: x })} error={errors.description} maxLength={500} />
        <Field label="الوقت اللي يناسبك" value={d.preferred_time} onInput={(x) => setD({ preferred_time: x })} error={errors.preferred_time} />
        <Field label="رقم موبايلك" kind="phone" maxLength={11} value={d.phone} onInput={(x) => setD({ phone: x })} error={errors.phone} autoComplete="tel" />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          ابعت الطلب
        </Button>
      </Card>
    </>
  );
}

function Visitors() {
  const { x } = useAppState();
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const act = useAction();
  useEffect(() => {
    refreshX().catch((e: Error) => setLoadErr(e.message));
  }, []);
  const list = x?.visitors ?? [];
  return (
    <>
      <a class="btn btn--primary btn--block" href="#r/requests/new-visitor">
        <Icon name="qr" size={20} />
        <span>اعمل تصريح زائر</span>
      </a>
      <ErrorMessage error={loadErr || act.error} />
      {!x ? (
        <CardSkeleton />
      ) : list.length === 0 ? (
        <Empty icon="qr">مفيش تصاريح. اعمل تصريح وابعت الكود للزائر، والأمن هيتأكد منه على البوابة.</Empty>
      ) : (
        <div class="list">
          {list.map((vis) => (
            <Row key={vis.code} title={vis.name} meta={[formatDate(vis.date), vis.note].filter(Boolean).join(' · ')} badge={vis.status ? <Badge tone={ticketTone(vis.status)}>{vis.status}</Badge> : undefined} value={<span class="ltr">{vis.code}</span>}>
              {vis.code && (!vis.status || vis.status === 'ساري') && (
                <div class="list-row__actions">
                  <Button
                    variant="secondary"
                    icon="close"
                    loading={act.busy}
                    onClick={() => {
                      if (confirm(`تلغي تصريح ${vis.name ?? ''}؟`)) act.run(() => call('x_visitor_cancel', { code: vis.code }).then(() => refreshX()));
                    }}
                  >
                    الغي التصريح
                  </Button>
                </div>
              )}
            </Row>
          ))}
        </div>
      )}
    </>
  );
}

function VisitorForm() {
  const [d, setD, clear] = useDraft('visitor', { visitor_name: '', visit_date: today(), note: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<{ code: string; share_text: string } | null>(null);
  const act = useAction();

  if (result)
    return (
      <>
        <PageHeader title="التصريح جاهز" back="#r/requests/visitors" />
        <Card>
          <span class="muted">كود الزائر</span>
          <div class="code-box" data-testid="visitor-code">
            {result.code}
          </div>
          <ShareBox text={result.share_text} title="ابعته للزائر" />
        </Card>
      </>
    );

  const submit = async () => {
    const e = { visitor_name: req(d.visitor_name, 'اكتب اسم الزائر.'), visit_date: req(d.visit_date, 'اختار يوم الزيارة.') };
    setErrors(e);
    if (hasErrors(e)) return;
    const r = await act.run(() => call('x_visitor_add', { visitor_name: d.visitor_name.trim(), visit_date: d.visit_date, note: d.note.trim() }));
    if (r) {
      clear();
      setResult(r);
      refreshX().catch(() => {});
    }
  };

  return (
    <>
      <PageHeader title="تصريح زائر" back="#r/requests/visitors" />
      <Card>
        <Field label="اسم الزائر" value={d.visitor_name} onInput={(x) => setD({ visitor_name: x })} error={errors.visitor_name} />
        <DateField label="يوم الزيارة" value={d.visit_date} onChange={(x) => setD({ visit_date: x })} error={errors.visit_date} />
        <Field label="ملاحظة للأمن (اختياري)" value={d.note} onInput={(x) => setD({ note: x })} hint="زي: جاي يصلّح التكييف." />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          اعمل التصريح
        </Button>
      </Card>
    </>
  );
}
