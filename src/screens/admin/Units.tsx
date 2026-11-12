import { useState } from 'preact/hooks';
import { call, type AdminUnit } from '../../api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { ErrorMessage } from '../../components/Messages';
import { Badge, Empty, PageHeader, Row } from '../../components/Page';
import { Qr } from '../../components/Qr';
import { toast } from '../../components/Toast';
import { residentLink } from '../../lib/app';
import { onlyDigits } from '../../lib/digits';
import { formatMoney, formatNumber } from '../../lib/format';
import { waLink } from '../../lib/share';
import { useAction } from '../../lib/useAction';
import { amountError, amountValue, hasErrors, phoneError } from '../../lib/validate';
import { buildingName } from '../../lib/view';
import { navigate } from '../../router';
import { refreshView, useAppState } from '../../store';

export function Units({ sub }: { sub?: string }) {
  if (sub === 'cards') return <Cards />;
  if (sub) return <EditUnit id={sub} />;
  return <UnitList />;
}

function UnitList() {
  const { admin: v } = useAppState();
  const [q, setQ] = useState('');
  if (!v) return <CardSkeleton />;
  const list = v.units.filter((u) => !q || `${u.unit} ${u.owner_name ?? ''} ${u.pay_code}`.includes(q));
  return (
    <>
      <PageHeader title="الشقق" subtitle={`${formatNumber(v.units.length)} شقة`} />
      <a class="btn btn--secondary btn--block" href="#a/units/cards">
        <Icon name="print" size={20} />
        <span>اطبع كروت الأكواد (QR)</span>
      </a>
      {v.units.length > 6 && <Field label="دوّر على شقة" value={q} onInput={setQ} />}
      {list.length === 0 ? (
        <Empty icon="building">مفيش شقق.</Empty>
      ) : (
        <div class="list">
          {list.map((u) => (
            <UnitRow key={u.id} u={u} appUrl={v.app_url} building={buildingName(v.building)} />
          ))}
        </div>
      )}
    </>
  );
}

function UnitRow({ u, appUrl, building }: { u: AdminUnit; appUrl: string; building: string }) {
  const due = Number(u.balance_due ?? 0);
  const link = residentLink(u.pay_code, appUrl);
  const msg = `أهلاً ${u.owner_name ?? ''}، ده لينك حساب شقة ${u.unit} في ${building} على تطبيق عمارتنا. تقدر تشوف عليك كام وتدفع وتشوف مصاريف العمارة:\n${link}\nكود الدفع: ${u.pay_code}`;
  return (
    <Row
      title={`شقة ${u.unit}${u.owner_name ? ` · ${u.owner_name}` : ''}`}
      meta={
        <>
          كود <span class="ltr num">{u.pay_code}</span>
          {u.phone ? (
            <>
              {' '}
              · <span class="ltr">{u.phone}</span>
            </>
          ) : (
            ' · مفيش رقم'
          )}
        </>
      }
      value={due > 0 ? formatMoney(due) : undefined}
      badge={due > 0 ? <Badge tone="warn">عليها</Badge> : Number(u.credit ?? 0) > 0 ? <Badge tone="success">ليها {formatNumber(u.credit)}</Badge> : <Badge tone="success">خالصة</Badge>}
    >
      <div class="list-row__actions">
        <a class="btn btn--secondary" href={waLink(msg, u.phone)} target="_blank" rel="noopener">
          <Icon name="send" size={20} />
          <span>ابعت اللينك</span>
        </a>
        <a class="btn btn--ghost" href={`#a/units/${u.id}`}>
          <Icon name="edit" size={20} />
          <span>تعديل</span>
        </a>
      </div>
    </Row>
  );
}

function EditUnit({ id }: { id: string }) {
  const { admin: v } = useAppState();
  const u = v?.units.find((x) => String(x.id) === id);
  const [d, setD] = useState({ owner_name: u?.owner_name ?? '', phone: u?.phone ?? '', monthly_fee: u?.monthly_fee ? String(u.monthly_fee) : '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const act = useAction();
  if (!v) return <CardSkeleton />;
  if (!u) return <Empty icon="building">الشقة دي مش موجودة.</Empty>;

  const submit = async () => {
    const e = { phone: phoneError(d.phone, false), monthly_fee: amountError(d.monthly_fee) };
    setErrors(e);
    if (hasErrors(e)) return;
    const ok = await act.run(() => call('a_unit', { id: u.id, owner_name: d.owner_name.trim(), phone: onlyDigits(d.phone), monthly_fee: amountValue(d.monthly_fee) }));
    if (ok) {
      toast('اتحفظ');
      await refreshView().catch(() => {});
      navigate('#a/units');
    }
  };

  return (
    <>
      <PageHeader title={`شقة ${u.unit}`} back="#a/units" subtitle={`كود الدفع ${u.pay_code}`} />
      <Card>
        <Field label="اسم الساكن أو المالك" value={d.owner_name} onInput={(x) => setD({ ...d, owner_name: x })} />
        <Field label="رقم الموبايل" hint="عشان رسايل التذكير والإيصالات توصله على واتساب." kind="phone" maxLength={11} value={d.phone} onInput={(x) => setD({ ...d, phone: x })} error={errors.phone} />
        <Field label="الاشتراك الشهري (جنيه)" kind="amount" value={d.monthly_fee} onInput={(x) => setD({ ...d, monthly_fee: x })} error={errors.monthly_fee} />
        <ErrorMessage error={act.error} />
        <Button block loading={act.busy} onClick={submit}>
          احفظ
        </Button>
      </Card>
    </>
  );
}

function Cards() {
  const { admin: v } = useAppState();
  if (!v) return <CardSkeleton />;
  const name = buildingName(v.building);
  return (
    <>
      <div class="no-print stack">
        <PageHeader title="كروت الأكواد" back="#a/units" subtitle="اطبعها وادّي كل شقة الكارت بتاعها. الساكن يصوّر الـ QR ويدخل على حسابه." />
        <Button block icon="print" onClick={() => window.print()}>
          اطبع أو احفظ PDF
        </Button>
      </div>
      <h1 class="only-print screen__title">{name}: كروت دخول الشقق</h1>
      <div class="qr-grid">
        {v.units.map((u) => (
          <div key={u.id} class="qr-card">
            <strong>{name}</strong>
            <span>شقة {u.unit}</span>
            <Qr text={residentLink(u.pay_code, v.app_url)} label={`QR شقة ${u.unit}`} />
            <span class="qr-card__code">{u.pay_code}</span>
            <span style={{ fontSize: '13px' }}>صوّر الكود أو ادخل على {v.app_url.replace(/^https?:\/\//, '')}</span>
          </div>
        ))}
      </div>
    </>
  );
}
