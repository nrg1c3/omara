import { useEffect, useState } from 'preact/hooks';
import { Loading } from '../components/Loading';
import { onlyDigits } from '../lib/digits';
import { replace } from '../router';
import { loginResident } from '../store';
import { Login } from './Login';

/** #c=CODE: دخول الساكن على طول من اللينك أو الـ QR */
export function CodeLogin({ code }: { code: string }) {
  const clean = onlyDigits(code);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    loginResident(clean)
      .then(() => alive && replace({ name: 'resident', tab: 'home' }))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [clean]);

  if (error) return <Login initialCode={clean} initialError={error} />;
  return (
    <main class="screen" style={{ justifyContent: 'center', minHeight: '60vh' }}>
      <Loading text="بندخّلك..." />
    </main>
  );
}
