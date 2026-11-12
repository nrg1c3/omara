import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { call, type Visitor } from '../api';
import { Button } from '../components/Button';
import { toast } from '../components/Toast';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { Alert, ErrorMessage } from '../components/Messages';
import { Badge, Empty, PageHeader, Row } from '../components/Page';
import { onlyDigits } from '../lib/digits';
import { today, formatDate } from '../lib/format';
import { useAction } from '../lib/useAction';
import { saveCachedView, loadCachedView } from '../session';
import { logout, startSession, useAppState } from '../store';
import { validateBuilding, validatePin } from './Login';

export const GUARD_POLL_MS = 60_000;

export function GuardScreen() {
  const { session } = useAppState();
  return session?.role === 'guard' ? <GuardHome /> : <GuardLogin />;
}

function GuardLogin() {
  const [b, setB] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  const submit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    const er = { b: validateBuilding(b), pin: validatePin(pin) };
    setErrors(er);
    if (er.b || er.pin) return;
    const r = await act.run(() => call('y_guard_login', { building_id: b.trim(), pin: onlyDigits(pin) }));
    if (r) {
      saveCachedView('guard', r.visitors ?? []);
      startSession({ role: 'guard', token: r.token, building_id: b.trim(), at: Date.now() });
    }
  };
  return (
    <main class="screen">
      <PageHeader title="دخول الأمن" back="#login" subtitle="الكود والرقم السري من أمين الصندوق." />
      <Card>
        <form class="stack" style={{ gap: '16px' }} onSubmit={submit} noValidate>
          <Field label="كود العمارة" kind="code" value={b} onInput={setB} error={errors.b} />
          <Field label="الرقم السري" kind="digits" maxLength={6} value={pin} onInput={setPin} error={errors.pin} />
          <ErrorMessage error={act.error} />
          <Button type="submit" block loading={act.busy}>
            ادخل
          </Button>
        </form>
      </Card>
    </main>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  } catch {
    /* مفيش صوت */
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignore */
  }
}

const key = (v: Visitor) => String(v.code || `${v.name}-${v.date}`);

function GuardHome() {
  const [visitors, setVisitors] = useState<Visitor[]>(() => loadCachedView<Visitor[]>('guard')?.data ?? []);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set(visitors.map(key)));
  const act = useAction();

  const load = async () => {
    try {
      const r = await call('y_guard_view', {});
      const list = r.visitors ?? [];
      const fresh = list.filter((v) => !seen.current.has(key(v)));
      if (fresh.length && seen.current.size > 0) {
        beep();
        toast(fresh.length === 1 ? `زائر جديد: ${fresh[0].name}` : `${fresh.length} زوار جداد`);
        setNewCount((n) => n + fresh.length);
      }
      list.forEach((v) => seen.current.add(key(v)));
      setVisitors(list);
      saveCachedView('guard', list);
      setLoadErr(null);
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  };

  useEffect(() => {
    load();
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, GUARD_POLL_MS);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const check = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    const c = code.trim();
    if (!c) {
      setCodeErr('اكتب الكود اللي مع الزائر.');
      return;
    }
    setCodeErr(null);
    const r = await act.run(() => call('y_guard_check', { code: c }));
    if (r) {
      setResult({ valid: r.valid, message: r.message });
      if (r.valid) {
        setCode('');
        load();
      }
    }
  };

  const t = today();
  const todays = visitors.filter((v) => !v.date || v.date === t);
  const later = visitors.filter((v) => v.date && v.date > t);

  return (
    <main class="screen">
      <PageHeader
        title="الأمن"
        subtitle="زوار النهارده، وبيتحدّث كل دقيقة."
        action={
          <Button variant="ghost" icon="logout" onClick={() => logout()}>
            خروج
          </Button>
        }
      />
      <Card title="اتأكد من كود زائر">
        <form class="stack" onSubmit={check} noValidate>
          <Field label="كود التصريح" kind="code" maxLength={6} value={code} onInput={setCode} error={codeErr} />
          <ErrorMessage error={act.error} />
          <Button type="submit" block loading={act.busy} icon="shield">
            اتأكد
          </Button>
        </form>
        {result && (
          <Alert tone={result.valid ? 'success' : 'error'} title={result.valid ? 'مسموح يدخل.' : 'مش مسموح.'}>
            {result.message}
          </Alert>
        )}
      </Card>
      {newCount > 0 && (
        <button type="button" class="alert alert--warn" style={{ border: 0, textAlign: 'start', cursor: 'pointer' }} onClick={() => setNewCount(0)}>
          <Icon name="bell" size={20} />
          <span>فيه {newCount} زائر جديد اتضاف. (اضغط عشان تخفي التنبيه)</span>
        </button>
      )}
      <ErrorMessage error={loadErr} onRetry={load} />
      <h2 class="section-title">زوار النهارده ({todays.length})</h2>
      {todays.length === 0 ? <Empty icon="users">مفيش زوار متسجلين النهارده.</Empty> : <VisitorList list={todays} />}
      {later.length > 0 && (
        <>
          <h2 class="section-title">جايين بعدين</h2>
          <VisitorList list={later} />
        </>
      )}
    </main>
  );
}

function VisitorList({ list }: { list: Visitor[] }) {
  return (
    <div class="list">
      {list.map((v) => (
        <Row key={key(v)} title={v.name || 'زائر'} meta={[v.unit ? `شقة ${v.unit}` : '', formatDate(v.date), v.note].filter(Boolean).join(' · ')} badge={v.status ? <Badge tone={/دخل/.test(v.status) ? 'success' : 'neutral'}>{v.status}</Badge> : undefined} />
      ))}
    </div>
  );
}
