import { useEffect, useState } from 'preact/hooks';

/** لينك التطبيق الحالي (oa.nrg-egypt.com في النشر) */
export function appUrl(): string {
  return `${location.origin}${location.pathname}`;
}

/** لينك دخول الساكن على طول */
export function residentLink(payCode: string, base?: string): string {
  return `${(base || appUrl()).replace(/#.*$/, '')}#c=${payCode}`;
}

/* ===== تثبيت التطبيق (beforeinstallprompt) ===== */
interface BIPEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    subs.forEach((s) => s());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    subs.forEach((s) => s());
  });
}

export function useInstall(): { canInstall: boolean; install: () => Promise<void> } {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => {
      subs.delete(s);
    };
  }, []);
  return {
    canInstall: !!deferred,
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      subs.forEach((s) => s());
    }
  };
}

export function ticketTone(status: string | undefined): 'warn' | 'success' | 'neutral' {
  if (status === 'اتحل' || status === 'اتنفذ') return 'success';
  if (status === 'جديد') return 'warn';
  return 'neutral';
}
