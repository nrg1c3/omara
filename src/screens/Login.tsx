import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { Alert, ErrorMessage } from '../components/Messages';
import { Segmented } from '../components/Segmented';
import { onlyDigits } from '../lib/digits';
import { replace } from '../router';
import { loginAdmin, loginResident, setState, useAppState } from '../store';

type Mode = 'resident' | 'admin';

export const CODE_LEN = 8;
export const PIN_LEN = 6;

export function validateCode(code: string): string | null {
  const c = onlyDigits(code);
  if (!c) return 'اكتب كود الدفع. هتلاقيه على كارت الشقة أو في رسالة أمين الصندوق.';
  if (c.length !== CODE_LEN) return `كود الدفع ${CODE_LEN} أرقام. انت كاتب ${c.length}، راجعه تاني.`;
  return null;
}

export function validateBuilding(id: string): string | null {
  return id.trim() ? null : 'اكتب كود العمارة، زي TEST14.';
}

export function validatePin(pin: string): string | null {
  const p = onlyDigits(pin);
  if (!p) return 'اكتب الرقم السري.';
  if (p.length !== PIN_LEN) return `الرقم السري ${PIN_LEN} أرقام.`;
  return null;
}

export function Login({ initialMode = 'resident', initialCode = '', initialError = null }: { initialMode?: Mode; initialCode?: string; initialError?: string | null }) {
  const { loginNotice } = useAppState();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [code, setCode] = useState(initialCode);
  const [building, setBuilding] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setServerError(null);
  };

  const submit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setServerError(null);
    setState({ loginNotice: null });
    if (mode === 'resident') {
      const err = validateCode(code);
      setErrors({ code: err });
      if (err) return;
      setBusy(true);
      try {
        await loginResident(onlyDigits(code));
        replace({ name: 'resident', tab: 'home' });
      } catch (ex) {
        setServerError((ex as Error).message);
      } finally {
        setBusy(false);
      }
    } else {
      const eb = validateBuilding(building);
      const ep = validatePin(pin);
      setErrors({ building: eb, pin: ep });
      if (eb || ep) return;
      setBusy(true);
      try {
        await loginAdmin(building.trim(), onlyDigits(pin));
        replace({ name: 'admin', tab: 'home' });
      } catch (ex) {
        setServerError((ex as Error).message);
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <main class="screen">
      <header class="stack" style={{ gap: '4px', paddingTop: '8px' }}>
        <div class="row" style={{ color: 'var(--primary)' }}>
          <Icon name="building" size={30} />
          <h1 class="screen__title">عمارتنا</h1>
        </div>
        <p class="screen__subtitle">حساب العمارة كله في مكان واحد.</p>
      </header>

      <Segmented
        label="نوع الدخول"
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'resident', label: 'ساكن' },
          { value: 'admin', label: 'أمين الصندوق' }
        ]}
      />

      {loginNotice && <Alert tone="warn">{loginNotice}</Alert>}

      <Card>
        <form class="stack" style={{ gap: '16px' }} onSubmit={submit} noValidate>
          {mode === 'resident' ? (
            <Field
              key="code"
              label="كود الدفع"
              hint="8 أرقام، مكتوب على كارت الشقة."
              kind="digits"
              maxLength={CODE_LEN}
              value={code}
              onInput={(v) => {
                setCode(v);
                if (errors.code) setErrors({ code: null });
              }}
              error={errors.code}
              autoComplete="one-time-code"
              name="code"
            />
          ) : (
            <>
              <Field
                key="building"
                label="كود العمارة"
                kind="code"
                value={building}
                onInput={(v) => {
                  setBuilding(v);
                  if (errors.building) setErrors({ ...errors, building: null });
                }}
                error={errors.building}
                autoComplete="username"
                name="building_id"
              />
              <Field
                key="pin"
                label="الرقم السري"
                hint="6 أرقام."
                kind="digits"
                maxLength={PIN_LEN}
                value={pin}
                onInput={(v) => {
                  setPin(v);
                  if (errors.pin) setErrors({ ...errors, pin: null });
                }}
                error={errors.pin}
                autoComplete="current-password"
                name="pin"
              />
            </>
          )}
          <ErrorMessage error={serverError} />
          <Button type="submit" block loading={busy}>
            ادخل
          </Button>
        </form>
      </Card>

      <nav class="stack" aria-label="روابط تانية" style={{ gap: '4px' }}>
        <a class="btn btn--ghost btn--block" href="#register">
          <Icon name="plus" size={20} />
          <span>سجّل عمارتك</span>
        </a>
        <a class="btn btn--ghost btn--block" href="#about">
          <Icon name="building" size={20} />
          <span>إيه هو عمارتنا؟</span>
        </a>
        <a class="btn btn--ghost btn--block" href="#guard">
          <Icon name="shield" size={20} />
          <span>دخول الأمن</span>
        </a>
      </nav>
    </main>
  );
}
