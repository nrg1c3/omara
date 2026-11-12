import { useState } from 'preact/hooks';
import { SessionExpiredError } from '../api';

/**
 * يشغّل فعل (طلب API) مع حالة "لحظة..." والغلط.
 * بيرجّع النتيجة أو undefined لو فشل (والغلط بيتحط في error).
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof SessionExpiredError)) setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
