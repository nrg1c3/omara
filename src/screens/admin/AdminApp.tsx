import { BottomNav, type NavItem } from '../../components/BottomNav';
import { ErrorMessage } from '../../components/Messages';
import type { AdminTab } from '../../router';
import { useAppState } from '../../store';
import { useRefresh } from '../useRefresh';
import { AdminHome } from './Home';
import { AdminMore } from './More';
import { Record } from './Record';
import { AdminRequests } from './Requests';
import { Units } from './Units';

const NAV: NavItem[] = [
  { key: 'home', label: 'الرئيسية', icon: 'home', href: '#a/home' },
  { key: 'record', label: 'تسجيل', icon: 'plus', href: '#a/record' },
  { key: 'units', label: 'الشقق', icon: 'building', href: '#a/units' },
  { key: 'requests', label: 'الطلبات', icon: 'list', href: '#a/requests' },
  { key: 'more', label: 'المزيد', icon: 'more', href: '#a/more' }
];

export function AdminApp({ tab, sub }: { tab: AdminTab; sub?: string }) {
  const { admin: v } = useAppState();
  const { error, retry } = useRefresh();
  return (
    <>
      <main class="screen screen--with-nav">
        {error && <ErrorMessage error={v ? `${error} (بتشوف آخر بيانات اتحمّلت)` : error} onRetry={retry} />}
        {tab === 'home' && <AdminHome />}
        {tab === 'record' && <Record sub={sub} />}
        {tab === 'units' && <Units sub={sub} />}
        {tab === 'requests' && <AdminRequests sub={sub} />}
        {tab === 'more' && <AdminMore sub={sub} />}
      </main>
      <BottomNav items={NAV} active={tab} />
    </>
  );
}
