import { useEffect, useState } from 'preact/hooks';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div class="status-bar" role="status">
      مفيش إنترنت دلوقتي. بتشوف آخر بيانات اتحمّلت.
    </div>
  );
}
