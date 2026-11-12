import { useEffect, useState } from 'preact/hooks';
import { Icon } from './Icon';

let push: ((msg: string) => void) | null = null;

/** رسالة قصيرة بتختفي لوحدها ("اتنسخ"، "اتبعت") */
export function toast(msg: string): void {
  push?.(msg);
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    push = (m) => {
      setMsg(m);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2600);
    };
    return () => {
      push = null;
      window.clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <div class="toast" role="status" aria-live="polite">
      <Icon name="check" size={20} />
      <span>{msg}</span>
    </div>
  );
}
