import { useEffect } from 'preact/hooks';
import { OfflineBar } from './components/OfflineBar';
import { replace, useRoute, type Route } from './router';
import { CodeLogin } from './screens/CodeLogin';
import { Login } from './screens/Login';
import { ToastHost } from './components/Toast';
import { ResidentApp } from './screens/resident/ResidentApp';
import type { Session } from './session';
import { useAppState } from './store';
import { lazy } from './lib/lazy';

const AdminApp = lazy(() => import('./screens/admin/AdminApp').then((m) => m.AdminApp));
const GuardScreen = lazy(() => import('./screens/Guard').then((m) => m.GuardScreen));
const NrgScreen = lazy(() => import('./screens/Nrg').then((m) => m.NrgScreen));
const About = lazy(() => import('./screens/About').then((m) => m.About));
const Register = lazy(() => import('./screens/Register').then((m) => m.Register));

function homeFor(s: Session): Route | null {
  if (s.role === 'resident') return { name: 'resident', tab: 'home' };
  if (s.role === 'admin') return { name: 'admin', tab: 'home' };
  if (s.role === 'guard') return { name: 'guard' };
  if (s.role === 'nrg') return { name: 'nrg' };
  return null;
}

/** بيقرر الشاشة اللي تتعرض حسب الـ hash والجلسة */
function resolve(route: Route, session: Session | null): Route {
  if (route.name === 'code' || route.name === 'register' || route.name === 'about' || route.name === 'guard' || route.name === 'nrg') return route;
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
      {target.name === 'resident' && <ResidentApp tab={target.tab} sub={target.sub} />}
      {target.name === 'admin' && <AdminApp tab={target.tab} sub={target.sub} />}
      {target.name === 'guard' && <GuardScreen />}
      {target.name === 'nrg' && <NrgScreen />}
      {target.name === 'register' && <Register />}
      {target.name === 'about' && <About />}
      <ToastHost />
    </>
  );
}
