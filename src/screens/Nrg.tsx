import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { call } from '../api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CardSkeleton } from '../components/Loading';
import { ErrorMessage } from '../components/Messages';
import { Empty, PageHeader, Row } from '../components/Page';
import { formatNumber } from '../lib/format';
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

const LABELS: Record<string, string> = {
  id: 'الكود',
  building_id: 'الكود',
  name: 'الاسم',
  units: 'الشقق',
  total_units: 'الشقق',
  due: 'المستحق',
  due_this_month: 'المستحق',
  collected: 'المحصّل',
  collected_this_month: 'المحصّل',
  collection_pct: 'نسبة التحصيل %',
  pct: 'نسبة التحصيل %',
  fund: 'الصندوق',
  balance: 'الصندوق',
  claims: 'مطالبات',
  pending_claims: 'مطالبات مستنية',
  services: 'صنايعية',
  commission: 'عمولة الصنايعية',
  expected_subscription: 'الاشتراك المتوقع',
  subscription: 'الاشتراك المتوقع',
  created: 'تاريخ التسجيل',
  treasurer_name: 'أمين الصندوق',
  treasurer_phone: 'الموبايل'
};

type Obj = Record<string, unknown>;

function fmt(v: unknown): string {
  if (typeof v === 'number') return formatNumber(v);
  if (Array.isArray(v)) return formatNumber(v.length);
  if (v && typeof v === 'object') return '';
  return String(v ?? '');
}

/** شكل رد y_nrg_view مش موثّق بالتفصيل، فبنعرض أي array فيه كعماير وأي أرقام فوق كإجماليات */
function NrgDashboard() {
  const [data, setData] = useState<Obj | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () =>
    call('y_nrg_view', {})
      .then((r) => setData(r as Obj))
      .catch((e: Error) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  const list = data ? ((Object.values(data).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object') as Obj[] | undefined) ?? []) : [];
  const totals = data ? Object.entries(data).filter(([k, v]) => k !== 'ok' && (typeof v === 'number' || (v && typeof v === 'object' && !Array.isArray(v)))) : [];

  return (
    <main class="screen">
      <PageHeader
        title="لوحة NRG"
        subtitle={data ? `${formatNumber(list.length)} عمارة` : undefined}
        action={
          <Button variant="ghost" icon="logout" onClick={() => logout()}>
            خروج
          </Button>
        }
      />
      <ErrorMessage error={err} onRetry={load} />
      {!data && !err && <CardSkeleton lines={4} />}
      {totals.length > 0 && (
        <Card title="الإجمالي">
          <dl class="stack" style={{ gap: 0, margin: 0 }}>
            {totals.flatMap(([k, v]) =>
              typeof v === 'number'
                ? [[k, v] as [string, unknown]]
                : Object.entries(v as Obj).filter(([, x]) => typeof x === 'number' || typeof x === 'string')
            ).map(([k, v]) => (
              <div class="kv" key={k}>
                <dt>{LABELS[k] ?? k}</dt>
                <dd class="num">{fmt(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
      {data && list.length === 0 && <Empty icon="building">مفيش عماير.</Empty>}
      {list.length > 0 && (
        <div class="list">
          {list.map((b, i) => {
            const title = String(b.name ?? b.building_name ?? b.id ?? `عمارة ${i + 1}`);
            const entries = Object.entries(b).filter(([k, v]) => !['name', 'building_name'].includes(k) && v !== '' && v !== null && typeof v !== 'object');
            const arrays = Object.entries(b).filter(([, v]) => Array.isArray(v));
            return (
              <Row key={i} title={title}>
                <dl class="stack" style={{ gap: 0, margin: 0 }}>
                  {[...entries, ...arrays].map(([k, v]) => (
                    <div class="kv" key={k}>
                      <dt>{LABELS[k] ?? k}</dt>
                      <dd class="num">{fmt(v)}</dd>
                    </div>
                  ))}
                </dl>
              </Row>
            );
          })}
        </div>
      )}
    </main>
  );
}
