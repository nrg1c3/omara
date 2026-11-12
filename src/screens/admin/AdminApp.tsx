import { BottomNav, type NavItem } from '../../components/BottomNav';
import { Button } from '../../components/Button';
import { Card, Progress } from '../../components/Card';
import { CardSkeleton } from '../../components/Loading';
import { ErrorMessage } from '../../components/Messages';
import { formatMoney, formatNumber } from '../../lib/format';
import { buildingName } from '../../lib/view';
import type { AdminTab } from '../../router';
import { logout, useAppState } from '../../store';
import { Placeholder } from '../Placeholder';
import { useRefresh } from '../useRefresh';

const NAV: NavItem[] = [
  { key: 'home', label: 'الرئيسية', icon: 'home', href: '#a/home' },
  { key: 'record', label: 'تسجيل', icon: 'plus', href: '#a/record' },
  { key: 'units', label: 'الشقق', icon: 'building', href: '#a/units' },
  { key: 'requests', label: 'الطلبات', icon: 'list', href: '#a/requests' },
  { key: 'more', label: 'المزيد', icon: 'more', href: '#a/more' }
];

export function AdminApp({ tab }: { tab: AdminTab }) {
  const { admin: v } = useAppState();
  const { error, retry } = useRefresh();
  return (
    <>
      <main class="screen screen--with-nav">
        {tab === 'home' && <Home />}
        {tab === 'record' && <Placeholder title="تسجيل دفعة أو مصروف" phase={3} />}
        {tab === 'units' && <Placeholder title="الشقق" phase={3} />}
        {tab === 'requests' && <Placeholder title="البلاغات والصنايعية" phase={3} />}
        {tab === 'more' && <More />}
        {error && <ErrorMessage error={v ? `${error} (بتشوف آخر بيانات اتحمّلت)` : error} onRetry={retry} />}
      </main>
      <BottomNav items={NAV} active={tab} />
    </>
  );
}

function Home() {
  const { admin: v } = useAppState();
  if (!v) return <CardSkeleton lines={3} />;
  const fund = v.fund;
  return (
    <>
      <header class="stack" style={{ gap: '2px' }}>
        <h1 class="screen__title">لوحة الاتحاد</h1>
        <p class="screen__subtitle">أمين الصندوق · {buildingName(v.building)}</p>
      </header>
      {fund && (
        <Card hero>
          <span style={{ opacity: 0.95 }}>رصيد الصندوق</span>
          <span class="num" style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1.1 }}>
            {formatMoney(fund.balance)}
          </span>
          <span>
            دفعوا الشهر ده: {formatNumber(fund.paid_units)} شقة من {formatNumber(fund.total_units)}
          </span>
        </Card>
      )}
      {fund && <Progress value={fund.paid_units} max={fund.total_units} label="نسبة التحصيل" />}
      <div class="grid-2">
        <Card>
          <span class="muted">المتأخرين</span>
          <span class="num" style={{ fontSize: '22px', fontWeight: 700 }}>
            {formatNumber(v.late?.length ?? 0)}
          </span>
        </Card>
        <Card>
          <span class="muted">أعطال مفتوحة</span>
          <span class="num" style={{ fontSize: '22px', fontWeight: 700 }}>
            {formatNumber(v.open_tickets ?? 0)}
          </span>
        </Card>
      </div>
    </>
  );
}

function More() {
  return (
    <>
      <h1 class="screen__title">المزيد</h1>
      <Placeholder title="الإعلانات والتصويت والصيانة والتقارير" phase={3} />
      <Button variant="secondary" block icon="logout" onClick={() => logout()}>
        خروج
      </Button>
    </>
  );
}
