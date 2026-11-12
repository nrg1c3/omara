import { useEffect, useRef, useState } from 'preact/hooks';
import { readJSON, remove, writeJSON } from './storage';

/**
 * حالة فورم بتتحفظ في localStorage، عشان لو الصفحة رجعت أو النت قطع
 * المستخدم ما يكتبش تاني (CLAUDE.md §4 البطء). امسحها بـ clear() بعد الإرسال.
 */
export function useDraft<T extends object>(key: string, initial: T): [T, (patch: Partial<T>) => void, () => void] {
  const storageKey = `draft.${key}`;
  const [value, setValue] = useState<T>(() => ({ ...initial, ...(readJSON<Partial<T>>(storageKey) ?? {}) }));
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => writeJSON(storageKey, value), 250);
    return () => window.clearTimeout(timer.current);
  }, [storageKey, value]);

  const update = (patch: Partial<T>) => setValue((v) => ({ ...v, ...patch }));
  const clear = () => {
    window.clearTimeout(timer.current);
    remove(storageKey);
    setValue(initial);
  };
  return [value, update, clear];
}
