import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/Messages';

/** تحميل شاشة لما تتفتح بس (عشان الساكن ما يحمّلش شاشات أمين الصندوق على 3G) */
export function lazy<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let cached: ComponentType<P> | null = null;
  return function Lazy(props: P) {
    const [C, setC] = useState<ComponentType<P> | null>(() => cached);
    const [err, setErr] = useState<string | null>(null);
    const tryLoad = () => {
      setErr(null);
      load()
        .then((c) => {
          cached = c;
          setC(() => c);
        })
        .catch(() => setErr('الصفحة ما اتحمّلتش. اتأكد من النت وجرّب تاني.'));
    };
    useEffect(() => {
      if (!C) tryLoad();
    }, []);
    if (C) return <C {...props} />;
    return <main class="screen">{err ? <ErrorMessage error={err} onRetry={tryLoad} /> : <Loading />}</main>;
  };
}
