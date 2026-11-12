import { useEffect, useState } from 'preact/hooks';
import { Card, Progress } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { formatNumber } from '../../lib/format';
import { readJSON, writeJSON } from '../../lib/storage';
import { refreshY, useAppState } from '../../store';

interface Step {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

/**
 * خطوات البداية لأمين الصندوق: بتختفي لما تخلص أو لما يقفلها.
 * الهدف إن العمارة تبدأ تستخدم التطبيق فعلاً في أول أسبوع.
 */
export function SetupChecklist() {
  const { admin: v, y } = useAppState();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!y) refreshY().catch(() => {});
  }, []);
  if (!v || hidden || readJSON<boolean>(`setup.hidden.${v.building.id}`)) return null;

  const units = v.units ?? [];
  const withPhone = units.filter((u) => u.phone).length;
  const steps: Step[] = [
    { key: 'pay', label: 'اكتب بيانات التحويل (إنستاباي أو محفظة)', done: !!v.building.payment_info, href: '#a/more/building' },
    { key: 'phones', label: `ضيف موبايلات الشقق (${formatNumber(withPhone)} من ${formatNumber(units.length)})`, done: units.length > 0 && withPhone >= Math.ceil(units.length / 2), href: '#a/units' },
    { key: 'opening', label: 'سجّل الفلوس اللي في الصندوق دلوقتي', done: (v.payments ?? []).some((p) => p.month === 'opening') || (v.ledger ?? []).length > 0, href: '#a/record/opening' },
    { key: 'cards', label: 'اطبع كروت الأكواد ووزّعها على الشقق', done: !!readJSON<boolean>(`setup.cards.${v.building.id}`), href: '#a/units/cards' },
    { key: 'guard', label: 'اعمل حساب للبواب (لو فيه)', done: (y?.guards ?? []).length > 0 || !!readJSON<boolean>(`setup.noguard.${v.building.id}`), href: '#a/more/guards' }
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <Card>
      <div class="section-title">
        <span>جهّز العمارة</span>
        <span class="muted num" style={{ fontWeight: 600 }}>
          {formatNumber(done)} من {formatNumber(steps.length)}
        </span>
      </div>
      <Progress value={done} max={steps.length} label="خطوات تجهيز العمارة" />
      <div class="menu" style={{ border: 0 }}>
        {steps.map((s) => (
          <a
            key={s.key}
            class="menu-link"
            href={s.href}
            style={{ paddingInline: 0 }}
            onClick={() => s.key === 'cards' && writeJSON(`setup.cards.${v.building.id}`, true)}
          >
            <span style={{ color: s.done ? 'var(--primary)' : 'var(--muted)', display: 'flex' }}>
              <Icon name={s.done ? 'check' : 'chevron'} size={20} />
            </span>
            <span class="menu-link__label" style={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--muted)' : 'inherit' }}>
              <span class="sr-only">{s.done ? 'خلصت: ' : 'لسه: '}</span>
              {s.label}
            </span>
          </a>
        ))}
      </div>
      <button type="button" class="btn btn--ghost" onClick={() => { writeJSON(`setup.hidden.${v.building.id}`, true); setHidden(true); }}>
        اخفي الخطوات دي
      </button>
    </Card>
  );
}
