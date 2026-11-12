import { useState } from 'preact/hooks';
import { call, type RegisterUnitInput } from '../api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Choice, Toggle } from '../components/Form';
import { Icon } from '../components/Icon';
import { Alert, ErrorMessage } from '../components/Messages';
import { PageHeader, Row } from '../components/Page';
import { Qr } from '../components/Qr';
import { ShareBox } from '../components/ShareBox';
import { appUrl, residentLink } from '../lib/app';
import { normalizeDigits, onlyDigits, parseAmount } from '../lib/digits';
import { useDraft } from '../lib/draft';
import { formatNumber } from '../lib/format';
import { remove } from '../lib/storage';
import { useAction } from '../lib/useAction';
import { amountError, amountValue, emailError, hasErrors, phoneError, req } from '../lib/validate';
import { replace } from '../router';
import { startSession } from '../store';

type Step = 1 | 2 | 3;
type Method = 'floors' | 'paste' | 'manual';
interface UnitDraft {
  unit: string;
  owner_name: string;
  phone: string;
  monthly_fee: string;
}

const STEP_TITLES = ['بيانات العمارة', 'الشقق', 'أمين الصندوق'];

/** يولّد الشقق: أدوار × شقق في الدور */
export function generateUnits(floors: number, perFloor: number, numbering: 'seq' | 'floor', fee: string): UnitDraft[] {
  const out: UnitDraft[] = [];
  let n = 1;
  for (let f = 1; f <= floors; f++) {
    for (let i = 1; i <= perFloor; i++) {
      out.push({ unit: numbering === 'seq' ? String(n++) : `${f}${String(i).padStart(perFloor > 9 ? 2 : 1, '0')}`, owner_name: '', phone: '', monthly_fee: fee });
    }
  }
  return out;
}

/** لصق من Excel: كل سطر "الشقة، الاسم، الموبايل، الاشتراك" (بـ Tab أو فاصلة) */
export function parsePasted(text: string, fee: string): UnitDraft[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [unit = '', owner_name = '', phone = '', f = ''] = line.split(/\t|,|،|;/).map((x) => x.trim());
      return { unit: normalizeDigits(unit), owner_name, phone: onlyDigits(phone), monthly_fee: parseAmount(f) !== null ? String(parseAmount(f)) : fee };
    })
    .filter((u) => u.unit && !/^(الشقة|شقة|unit|رقم)$/i.test(u.unit));
}

export function Register() {
  const [step, setStep] = useState<Step>(1);
  const [b, setB, clearB] = useDraft('register.b', { name: '', address: '', due_day: '10', default_fee: '', payment_info: '', charge_current: true });
  const [t, setT, clearT] = useDraft('register.t', { treasurer_name: '', treasurer_phone: '', treasurer_email: '' });
  const [u, setU, clearU] = useDraft('register.u', { method: 'floors' as Method, floors: '', perFloor: '', numbering: 'seq' as 'seq' | 'floor', paste: '', units: [] as UnitDraft[] });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [done, setDone] = useState<{ building_id: string; pin: string; token: string; units: { unit: string; pay_code: string }[] } | null>(null);
  const act = useAction();

  if (done) return <Success r={done} name={b.name} />;

  const next1 = () => {
    const day = Number(onlyDigits(b.due_day));
    const e = {
      name: req(b.name, 'اكتب اسم العمارة، زي: عمارة 14 شارع النصر.'),
      address: req(b.address, 'اكتب العنوان.'),
      due_day: day >= 1 && day <= 28 ? null : 'اكتب يوم من 1 لـ 28.',
      default_fee: amountError(b.default_fee)
    };
    setErrors(e);
    if (!hasErrors(e)) setStep(2);
  };

  const next2 = () => {
    const units = u.units;
    const dup = units.map((x) => x.unit.trim()).find((x, i, a) => x && a.indexOf(x) !== i);
    const badPhone = units.find((x) => x.phone && phoneError(x.phone, false));
    const badFee = units.find((x) => amountError(x.monthly_fee));
    const e = {
      units: units.length === 0 ? 'ضيف الشقق الأول.' : units.some((x) => !x.unit.trim()) ? 'فيه شقة من غير رقم.' : dup ? `رقم الشقة ${dup} متكرر.` : badPhone ? `موبايل شقة ${badPhone.unit} غلط: 11 رقم ويبدأ بـ 01.` : badFee ? `اشتراك شقة ${badFee.unit} لازم يكون رقم.` : null
    };
    setErrors(e);
    if (!hasErrors(e)) setStep(3);
  };

  const submit = async () => {
    const e = { treasurer_name: req(t.treasurer_name, 'اكتب اسم أمين الصندوق.'), treasurer_phone: phoneError(t.treasurer_phone), treasurer_email: emailError(t.treasurer_email) };
    setErrors(e);
    if (hasErrors(e)) return;
    const units: RegisterUnitInput[] = u.units.map((x) => ({ unit: x.unit.trim(), owner_name: x.owner_name.trim(), phone: onlyDigits(x.phone), monthly_fee: amountValue(x.monthly_fee) }));
    const r = await act.run(() =>
      call('register', {
        name: b.name.trim(),
        address: b.address.trim(),
        due_day: Number(onlyDigits(b.due_day)),
        payment_info: b.payment_info.trim(),
        default_fee: amountValue(b.default_fee),
        treasurer_name: t.treasurer_name.trim(),
        treasurer_phone: onlyDigits(t.treasurer_phone),
        treasurer_email: t.treasurer_email.trim(),
        charge_current: b.charge_current,
        units
      })
    );
    if (r) {
      setDone(r);
      clearT();
      clearU();
      // بنسيب اسم العمارة لحد ما شاشة النجاح تتقفل
      remove('draft.register.b');
      void clearB;
    }
  };

  return (
    <main class="screen">
      <PageHeader title="سجّل عمارتك" back={step === 1 ? '#login' : undefined} subtitle={`خطوة ${step} من 3: ${STEP_TITLES[step - 1]}`} />
      <div class="progress" role="progressbar" aria-label="الخطوات" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
        <div class="progress__bar" style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      {step === 1 && (
        <Card>
          <Field label="اسم العمارة" value={b.name} onInput={(x) => setB({ name: x })} error={errors.name} />
          <Field label="العنوان" value={b.address} onInput={(x) => setB({ address: x })} error={errors.address} />
          <Field label="الاشتراك الشهري للشقة (جنيه)" hint="تقدر تغيّره لأي شقة بعدين." kind="amount" value={b.default_fee} onInput={(x) => setB({ default_fee: x })} error={errors.default_fee} />
          <Field label="آخر يوم للدفع في الشهر" kind="digits" maxLength={2} value={b.due_day} onInput={(x) => setB({ due_day: x })} error={errors.due_day} />
          <Field label="بيانات التحويل (اختياري)" hint="عنوان إنستاباي أو رقم المحفظة، عشان السكان يحوّلوا عليه." kind="textarea" value={b.payment_info} onInput={(x) => setB({ payment_info: x })} />
          <Toggle label="احسب اشتراك الشهر ده" hint="لو شيلتها، أول اشتراك هيبدأ الشهر الجاي." checked={b.charge_current} onChange={(x) => setB({ charge_current: x })} />
          <Button block onClick={next1}>
            التالي
          </Button>
        </Card>
      )}

      {step === 2 && (
        <>
          <Card>
            <Choice<Method>
              label="هتضيف الشقق إزاي؟"
              value={u.method}
              onChange={(m) => setU({ method: m })}
              options={[
                { value: 'floors', label: 'أدوار × شقق' },
                { value: 'paste', label: 'من Excel' },
                { value: 'manual', label: 'واحدة واحدة' }
              ]}
            />
            {u.method === 'floors' && (
              <>
                <div class="grid-2">
                  <Field label="عدد الأدوار" kind="digits" maxLength={2} value={u.floors} onInput={(x) => setU({ floors: x })} />
                  <Field label="شقق في الدور" kind="digits" maxLength={2} value={u.perFloor} onInput={(x) => setU({ perFloor: x })} />
                </div>
                <Choice<'seq' | 'floor'>
                  label="الترقيم"
                  value={u.numbering}
                  onChange={(x) => setU({ numbering: x })}
                  options={[
                    { value: 'seq', label: '1، 2، 3...' },
                    { value: 'floor', label: 'بالدور: 11، 12، 21...' }
                  ]}
                />
                <Button
                  variant="secondary"
                  block
                  onClick={() => {
                    const f = Number(u.floors);
                    const p = Number(u.perFloor);
                    if (!(f > 0 && p > 0) || f * p > 300) {
                      setErrors({ units: 'اكتب عدد الأدوار وعدد الشقق في الدور (300 شقة بالكتير).' });
                      return;
                    }
                    setErrors({});
                    setU({ units: generateUnits(f, p, u.numbering, String(amountValue(b.default_fee))) });
                  }}
                >
                  اعمل الشقق
                </Button>
              </>
            )}
            {u.method === 'paste' && (
              <>
                <Field label="الصق من Excel" hint="كل سطر: رقم الشقة، الاسم، الموبايل، الاشتراك. الاسم والموبايل اختياري." kind="textarea" rows={6} value={u.paste} onInput={(x) => setU({ paste: x })} />
                <Button variant="secondary" block onClick={() => setU({ units: parsePasted(u.paste, String(amountValue(b.default_fee))) })}>
                  اقرا الشقق
                </Button>
              </>
            )}
            {u.method === 'manual' && (
              <Button variant="secondary" block icon="plus" onClick={() => setU({ units: [...u.units, { unit: String(u.units.length + 1), owner_name: '', phone: '', monthly_fee: String(amountValue(b.default_fee)) }] })}>
                ضيف شقة
              </Button>
            )}
            <ErrorMessage error={errors.units} />
          </Card>

          {u.units.length > 0 && (
            <>
              <h2 class="section-title">
                <span>الشقق ({formatNumber(u.units.length)})</span>
                <Button variant="ghost" onClick={() => setU({ units: [] })}>
                  امسح الكل
                </Button>
              </h2>
              <p class="muted">الاسم والموبايل اختياري، وتقدر تكمّلهم بعدين. الموبايل بيخلّي التذكير يوصل واتساب.</p>
              <div class="list">
                {u.units.map((x, i) => {
                  const set = (patch: Partial<UnitDraft>) => setU({ units: u.units.map((y, j) => (j === i ? { ...y, ...patch } : y)) });
                  return (
                    <details key={i} class="list-row">
                      <summary style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', minHeight: '44px', alignItems: 'center', cursor: 'pointer' }}>
                        <strong>شقة {x.unit || '؟'}</strong>
                        <span class="muted">
                          {x.owner_name || 'من غير اسم'} · {formatNumber(Number(x.monthly_fee) || 0)} ج.م
                        </span>
                      </summary>
                      <Field label="رقم الشقة" value={x.unit} onInput={(v) => set({ unit: normalizeDigits(v) })} />
                      <Field label="الاسم" value={x.owner_name} onInput={(v) => set({ owner_name: v })} />
                      <Field label="الموبايل" kind="phone" maxLength={11} value={x.phone} onInput={(v) => set({ phone: v })} />
                      <Field label="الاشتراك" kind="amount" value={x.monthly_fee} onInput={(v) => set({ monthly_fee: v })} />
                      <Button variant="ghost" icon="close" onClick={() => setU({ units: u.units.filter((_, j) => j !== i) })}>
                        شيل الشقة
                      </Button>
                    </details>
                  );
                })}
              </div>
            </>
          )}
          <div class="list-row__actions">
            <Button variant="secondary" onClick={() => setStep(1)}>
              رجوع
            </Button>
            <Button onClick={next2}>التالي</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <Card>
          <Field label="اسم أمين الصندوق" value={t.treasurer_name} onInput={(x) => setT({ treasurer_name: x })} error={errors.treasurer_name} />
          <Field label="موبايل أمين الصندوق" kind="phone" maxLength={11} value={t.treasurer_phone} onInput={(x) => setT({ treasurer_phone: x })} error={errors.treasurer_phone} />
          <Field label="الإيميل (اختياري)" hint="بيوصله ملخص كل أسبوع." kind="email" value={t.treasurer_email} onInput={(x) => setT({ treasurer_email: x })} error={errors.treasurer_email} />
          <Alert tone="info">
            هنسجّل {b.name} بـ {formatNumber(u.units.length)} شقة. بعدها هيظهرلك الرقم السري وأكواد الشقق.
          </Alert>
          <ErrorMessage error={act.error} />
          <div class="list-row__actions">
            <Button variant="secondary" onClick={() => setStep(2)} disabled={act.busy}>
              رجوع
            </Button>
            <Button loading={act.busy} onClick={submit}>
              سجّل العمارة
            </Button>
          </div>
        </Card>
      )}
    </main>
  );
}

function Success({ r, name }: { r: { building_id: string; pin: string; token: string; units: { unit: string; pay_code: string }[] }; name: string }) {
  const base = appUrl();
  const text = `عمارة ${name} اتسجلت على تطبيق عمارتنا.\nكود العمارة: ${r.building_id}\nالرقم السري: ${r.pin}\nلينك التطبيق: ${base}`;
  return (
    <main class="screen">
      <div class="no-print stack">
        <PageHeader title="العمارة اتسجلت" />
        <Alert tone="warn">احفظ الرقم السري دلوقتي. ابعته لنفسك واتساب أو صوّر الشاشة.</Alert>
        <Card>
          <span class="muted">كود العمارة</span>
          <div class="code-box" data-testid="reg-building">
            {r.building_id}
          </div>
          <span class="muted">الرقم السري لأمين الصندوق</span>
          <div class="code-box" data-testid="reg-pin">
            {r.pin}
          </div>
          <ShareBox text={text} show={false} title="ابعتهم لنفسك" />
        </Card>
        <Button
          block
          icon="home"
          onClick={() => {
            startSession({ role: 'admin', token: r.token, building_id: r.building_id, at: Date.now() });
            replace({ name: 'admin', tab: 'home' });
          }}
        >
          ادخل لوحة الاتحاد
        </Button>
        <h2 class="section-title">
          <span>أكواد الشقق</span>
          <Button variant="ghost" icon="print" onClick={() => window.print()}>
            اطبع الكروت
          </Button>
        </h2>
        <div class="list">
          {r.units.map((x) => (
            <Row key={x.unit} title={`شقة ${x.unit}`} value={<span class="ltr">{x.pay_code}</span>} />
          ))}
        </div>
      </div>
      <h1 class="only-print screen__title">{name}: كروت دخول الشقق</h1>
      <div class="qr-grid only-print">
        {r.units.map((x) => (
          <div key={x.unit} class="qr-card">
            <strong>{name}</strong>
            <span>شقة {x.unit}</span>
            <Qr text={residentLink(x.pay_code, base)} label={`QR شقة ${x.unit}`} />
            <span class="qr-card__code">{x.pay_code}</span>
          </div>
        ))}
      </div>
      <p class="muted no-print" style={{ display: 'flex', gap: '6px' }}>
        <Icon name="shield" size={20} />
        <span>كل ساكن يدخل بكود شقته بس، وما يشوفش حسابات الشقق التانية.</span>
      </p>
    </main>
  );
}
