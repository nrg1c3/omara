import { useEffect } from 'preact/hooks';
import { OfflineBar } from './components/OfflineBar';
import { replace, useRoute, type Route } from './router';
import { AdminApp } from './screens/admin/AdminApp';
import { CodeLogin } from './screens/CodeLogin';
import { Login } from './screens/Login';
import { PlaceholderScreen } from './screens/Placeholder';
import { ResidentApp } from './screens/resident/ResidentApp';
import type { Session } from './session';
import { useAppState } from './store';

function homeFor(s: Session): Route | null {
  if (s.role === 'resident') return { name: 'resident', tab: 'home' };
  if (s.role === 'admin') return { name: 'admin', tab: 'home' };
  if (s.role === 'guard') return { name: 'guard' };
  if (s.role === 'nrg') return { name: 'nrg' };
  return null;
}

/** بيقرر الشاشة اللي تتعرض حسب الـ hash والجلسة */
function resolve(route: Route, session: Session | null): Route {
  if (route.name === 'code' || route.name === 'register' || route.name === 'guard' || route.name === 'nrg') return route;
  if (!session) return route.name === 'login' ? route : { name: 'login' };
  if (route.name === 'login') return homeFor(session) ?? route;
  if (route.name === 'resident' && session.role !== 'resident') return homeFor(session) ?? { name: 'login' };
  if (route.name === 'admin' && session.role !== 'admin') return homeFor(session) ?? { name: 'login' };
  return route;
}

export function App() {
  const route = useRoute();
  const { session } = useAppState();
  const target = resolve(route, session);

  useEffect(() => {
    if (target !== route) replace(target);
  }, [target, route]);

  return (
    <>
      <OfflineBar />
      {target.name === 'login' && <Login initialMode={target.mode} />}
      {target.name === 'code' && <CodeLogin code={target.code} />}
      {target.name === 'resident' && <ResidentApp tab={target.tab} />}
      {target.name === 'admin' && <AdminApp tab={target.tab} />}
      {target.name === 'guard' && <PlaceholderScreen title="شاشة الأمن" phase={4} />}
      {target.name === 'nrg' && <PlaceholderScreen title="لوحة NRG" phase={4} />}
      {target.name === 'register' && <PlaceholderScreen title="سجّل عمارتك" phase={4} />}
    </>
  );
}
