import { BottomNav, type NavItem } from '../../components/BottomNav';
import { Button } from '../../components/Button';
import { Card, Progress } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { ErrorMessage } from '../../components/Messages';
import { formatMoney, formatNumber } from '../../lib/format';
import { buildingName, unitLabel } from '../../lib/view';
import type { ResidentTab } from '../../router';
import { logout, useAppState } from '../../store';
import { Placeholder } from '../Placeholder';
import { useRefresh } from '../useRefresh';

const NAV: NavItem[] = [
  { key: 'home', label: 'الرئيسية', icon: 'home', href: '#r/home' },
  { key: 'pay', label: 'الدفع', icon: 'card', href: '#r/pay' },
  { key: 'ledger', label: 'الدفتر', icon: 'receipt', href: '#r/ledger' },
  { key: 'requests', label: 'الطلبات', icon: 'list', href: '#r/requests' },
  { key: 'more', label: 'المزيد', icon: 'more', href: '#r/more' }
];

export function ResidentApp({ tab }: { tab: ResidentTab }) {
  const { resident: v } = useAppState();
  const { error, retry } = useRefresh();

  return (
    <>
      <main class="screen screen--with-nav">
        {tab === 'home' && <Home />}
        {tab === 'pay' && <Placeholder title="الدفع" phase={2} />}
        {tab === 'ledger' && <Placeholder title="دفتر العمارة" phase={2} />}
        {tab === 'requests' && <Placeholder title="الطلبات" phase={2} />}
        {tab === 'more' && <More />}
        {error && <ErrorMessage error={v ? `${error} (بتشوف آخر بيانات اتحمّلت)` : error} onRetry={retry} />}
      </main>
      <BottomNav items={NAV} active={tab} />
    </>
  );
}

function Home() {
  const { resident: v } = useAppState();
  if (!v) {
    return (
      <>
        <CardSkeleton lines={2} />
        <CardSkeleton lines={3} />
      </>
    );
  }
  const due = Number(v.account?.balance_due ?? 0);
  const fund = v.fund;
  return (
    <>
      <header class="stack" style={{ gap: '2px' }}>
        <h1 class="screen__title">{buildingName(v.building)}</h1>
        <p class="screen__subtitle">شقة {unitLabel(v.unit)}</p>
      </header>

      <Card hero>
        <span style={{ fontSize: '16px', opacity: 0.95 }}>{due > 0 ? 'عليك' : 'مفيش عليك حاجة'}</span>
        <span class="num" style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.1 }} data-testid="balance-due">
          {formatMoney(due)}
        </span>
        {due > 0 && (
          <a class="btn btn--on-primary btn--block" href="#r/pay">
            ادفع
          </a>
        )}
      </Card>

      {fund && (
        <Card>
          <span class="muted">رصيد صندوق العمارة</span>
          <span class="num" style={{ fontSize: '26px', fontWeight: 700 }}>
            {formatMoney(fund.balance)}
          </span>
          <Progress value={fund.paid_units} max={fund.total_units} label="نسبة الشقق اللي دفعت" />
          <span class="muted">
            دفعوا الشهر ده: {formatNumber(fund.paid_units)} شقة من {formatNumber(fund.total_units)}
          </span>
        </Card>
      )}

      <div class="grid-2">
        <a class="tile" href="#r/requests">
          <Icon name="wrench" size={24} />
          <span>بلّغ عن عطل</span>
        </a>
        <a class="tile" href="#r/requests">
          <Icon name="qr" size={24} />
          <span>تصريح زائر</span>
        </a>
        <a class="tile" href="#r/ledger">
          <Icon name="receipt" size={24} />
          <span>دفتر العمارة</span>
        </a>
        <a class="tile" href="#r/more">
          <Icon name="chat" size={24} />
          <span>اسأل المساعد</span>
        </a>
      </div>
    </>
  );
}

function More() {
  return (
    <>
      <h1 class="screen__title">المزيد</h1>
      <Placeholder title="التصويت والإعلانات والأقساط والمساعد" phase={2} />
      <Button variant="secondary" block icon="logout" onClick={() => logout()}>
        خروج
      </Button>
    </>
  );
}
