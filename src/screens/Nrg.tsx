import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { call, type NrgView } from '../api';
import { Button } from '../components/Button';
import { Card, Progress } from '../components/Card';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { CardSkeleton } from '../components/Loading';
import { ErrorMessage } from '../components/Messages';
import { Badge, Empty, PageHeader, Row } from '../components/Page';
import { formatDate, formatMoney, formatMonth, formatNumber } from '../lib/format';
import { useAction } from '../lib/useAction';
import { logout, startSession, useAppState } from '../store';

/** لوحة NRG: المفتاح بيتكتب كل مرة وما بيتحفظش (التوكن بس بيتحفظ 7 أيام) */
export function NrgScreen() {
  const { session } = useAppState();
  return session?.role === 'nrg' ? <NrgDashboard /> : <NrgLogin />;
}

function NrgLogin() {
  const [k, setK] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const act = useAction();
  const submit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!k.trim()) {
      setErr('اكتب مفتاح NRG.');
      return;
    }
    setErr(null);
    const r = await act.run(() => call('y_nrg_login', { key: k.trim() }));
    if (r) startSession({ role: 'nrg', token: r.token, at: Date.now() });
    setK('');
  };
  return (
    <main class="screen">
      <PageHeader title="لوحة NRG" back="#login" />
      <Card>
        <form class="stack" style={{ gap: '16px' }} onSubmit={submit} noValidate>
          <div class="field">
            <label class="field__label" for="nrg-key">
              المفتاح
            </label>
            <input id="nrg-key" class="field__input field__input--ltr" type="password" autoComplete="off" value={k} onInput={(e) => setK(e.currentTarget.value)} aria-invalid={err ? 'true' : undefined} />
          </div>
          <ErrorMessage error={err || act.error} />
          <Button type="submit" block loading={act.busy}>
            ادخل
          </Button>
        </form>
      </Card>
    </main>
  );
}

const rateTone = (r: number) => (r >= 80 ? 'success' : r >= 50 ? 'warn' : 'danger') as 'success' | 'warn' | 'danger';

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div class="kv">
      <dt>{k}</dt>
      <dd class="num">{v}</dd>
    </div>
  );
}

function NrgDashboard() {
  const [data, setData] = useState<NrgView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const load = () => {
    setErr(null);
    return call('y_nrg_view', {})
      .then((r) => setData(r))
      .catch((e: Error) => setErr(e.message));
  };
  useEffect(() => {
    load();
  }, []);

  const all = data?.buildings ?? [];
  const term = q.trim().toLowerCase();
  const list = (term ? all.filter((b) => `${b.name} ${b.id} ${b.treasurer ?? ''} ${b.phone ?? ''}`.toLowerCase().includes(term)) : all)
    .slice()
    .sort((a, b) => Number(b.active !== false) - Number(a.active !== false) || a.rate - b.rate);
  const t = data?.totals;
  const rate = t && t.monthly_due ? Math.round((t.collected / t.monthly_due) * 100) : 0;

  return (
    <main class="screen">
      <PageHeader
        title="لوحة NRG"
        subtitle={data ? `${formatNumber(all.length)} عمارة${data.month ? ` · ${formatMonth(data.month)}` : ''}` : undefined}
        action={
          <Button variant="ghost" icon="logout" onClick={() => logout()}>
            خروج
          </Button>
        }
      />
      <ErrorMessage error={err} onRetry={load} />
      {!data && !err && <CardSkeleton lines={4} />}
      {t && (
        <Card hero>
          <span style={{ opacity: 0.95 }}>المحصّل الشهر ده</span>
          <span class="num" style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.1 }} data-testid="nrg-collected">
            {formatMoney(t.collected)} <span style={{ fontSize: '16px', fontWeight: 500 }}>من {formatMoney(t.monthly_due)}</span>
          </span>
          <div class="progress" style={{ background: 'rgba(255,255,255,0.25)' }} role="progressbar" aria-label="نسبة التحصيل" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
            <div class="progress__bar" style={{ width: `${Math.min(100, rate)}%`, background: '#fff' }} />
          </div>
          <span>نسبة التحصيل {formatNumber(rate)}%</span>
        </Card>
      )}
      {t && (
        <Card title="الإجمالي">
          <dl class="stack" style={{ gap: 0, margin: 0 }}>
            <Kv k="العماير" v={formatNumber(t.buildings)} />
            <Kv k="الشقق" v={formatNumber(t.units)} />
            <Kv k="طلبات الصنايعية" v={formatNumber(t.services)} />
            <Kv k="عمولة الصنايعية" v={formatMoney(t.commission)} />
            <Kv k="الاشتراك المتوقع (تقدير)" v={formatMoney(t.subscription_estimate)} />
          </dl>
        </Card>
      )}
      {all.length > 5 && <Field label="دوّر على عمارة" value={q} onInput={setQ} />}
      {data && all.length === 0 && <Empty icon="building">مفيش عماير.</Empty>}
      {data && all.length > 0 && list.length === 0 && <Empty icon="building">مفيش عمارة بالاسم ده.</Empty>}
      {list.length > 0 && (
        <div class="list">
          {list.map((b) => (
            <Row
              key={b.id}
              title={`${b.name} · ${b.id}`}
              meta={[`${formatNumber(b.units)} شقة`, b.treasurer ? `أمين الصندوق ${b.treasurer}` : '', b.since ? `من ${formatDate(b.since)}` : ''].filter(Boolean).join(' · ')}
              badge={b.active === false ? <Badge tone="neutral">مش شغالة</Badge> : <Badge tone={rateTone(b.rate)}>{formatNumber(b.rate)}%</Badge>}
            >
              <Progress value={b.collected} max={b.monthly_due} label={`تحصيل ${b.name}`} />
              <dl class="stack" style={{ gap: 0, margin: 0 }}>
                <Kv k="اتحصّل" v={`${formatMoney(b.collected)} من ${formatMoney(b.monthly_due)}`} />
                <Kv k="الصندوق" v={formatMoney(b.fund)} />
                <Kv k="تحويلات مستنية" v={formatNumber(b.pending_claims)} />
                <Kv k="صنايعية" v={`${formatNumber(b.services)} · عمولة ${formatMoney(b.commission)}`} />
              </dl>
              {b.phone && (
                <div class="list-row__actions">
                  <a class="btn btn--secondary" href={`tel:${b.phone}`}>
                    <Icon name="phone" size={20} />
                    <span class="ltr">{b.phone}</span>
                  </a>
                </div>
              )}
            </Row>
          ))}
        </div>
      )}
      {data && (
        <Button variant="ghost" icon="refresh" onClick={load}>
          تحديث
        </Button>
      )}
    </main>
  );
}
