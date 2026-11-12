import { BottomNav, type NavItem } from '../../components/BottomNav';
import { ErrorMessage } from '../../components/Messages';
import type { ResidentTab } from '../../router';
import { useAppState } from '../../store';
import { useRefresh } from '../useRefresh';
import { Home } from './Home';
import { Ledger } from './Ledger';
import { More } from './More';
import { Pay } from './Pay';
import { Requests } from './Requests';

const NAV: NavItem[] = [
  { key: 'home', label: 'الرئيسية', icon: 'home', href: '#r/home' },
  { key: 'pay', label: 'الدفع', icon: 'card', href: '#r/pay' },
  { key: 'ledger', label: 'الدفتر', icon: 'receipt', href: '#r/ledger' },
  { key: 'requests', label: 'الطلبات', icon: 'list', href: '#r/requests' },
  { key: 'more', label: 'المزيد', icon: 'more', href: '#r/more' }
];

export function ResidentApp({ tab, sub }: { tab: ResidentTab; sub?: string }) {
  const { resident: v } = useAppState();
  const { error, retry } = useRefresh();

  return (
    <>
      <main class="screen screen--with-nav">
        {error && <ErrorMessage error={v ? `${error} (بتشوف آخر بيانات اتحمّلت)` : error} onRetry={retry} />}
        {tab === 'home' && <Home />}
        {tab === 'pay' && <Pay sub={sub} />}
        {tab === 'ledger' && <Ledger />}
        {tab === 'requests' && <Requests sub={sub} />}
        {tab === 'more' && <More sub={sub} />}
      </main>
      <BottomNav items={NAV} active={tab} />
    </>
  );
}
