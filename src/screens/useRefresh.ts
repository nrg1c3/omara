import { useEffect, useState } from 'preact/hooks';
import { SessionExpiredError } from '../api';
import { refreshView } from '../store';

/** بيحدّث الشاشة أول ما تفتح. لو فشل والكاش موجود، الكاش بيفضل معروض مع رسالة. */
export function useRefresh(deps: unknown[] = []) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshView();
    } catch (e) {
      if (!(e instanceof SessionExpiredError)) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { loading, error, retry: run };
}
