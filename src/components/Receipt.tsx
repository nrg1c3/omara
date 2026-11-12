import { useEffect, useState } from 'preact/hooks';
import { call, type ReceiptKind, type ReceiptReading } from '../api';
import { compressImage } from '../lib/image';
import { Button } from './Button';
import { Icon } from './Icon';
import { Loading } from './Loading';
import { ErrorMessage } from './Messages';

/**
 * رفع صورة إيصال: بيضغطها في المتصفح، وبيبعتها لـ read_receipt عشان Claude يقراها،
 * وبيرجّع القراءة (فيها receipt_id) للفورم.
 */
export function ReceiptPicker({
  kind,
  unit,
  label = 'صوّر الإيصال أو اختاره من الصور',
  reading,
  onRead,
  onClear,
  error
}: {
  kind: ReceiptKind;
  unit?: string;
  label?: string;
  reading: ReceiptReading | null;
  onRead: (r: ReceiptReading, preview: string) => void;
  onClear: () => void;
  error?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'compress' | 'read' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setBusy('compress');
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      setBusy('read');
      const r = await call('read_receipt', { image: dataUrl, kind, ...(unit ? { unit } : {}) });
      onRead(r, dataUrl);
    } catch (e) {
      setErr((e as Error).message);
      setPreview(null);
    } finally {
      setBusy(null);
    }
  };

  if (busy) {
    return (
      <div class="card" aria-live="polite">
        {preview && <img class="thumb" src={preview} alt="صورة الإيصال" />}
        <Loading text={busy === 'compress' ? 'بنجهّز الصورة...' : 'بنقرا الإيصال... ممكن ياخد دقيقة'} />
      </div>
    );
  }

  if (reading && preview) {
    return (
      <div class="card">
        <img class="thumb" src={preview} alt="صورة الإيصال" />
        <div class={`alert ${reading.read_ok ? 'alert--success' : 'alert--warn'}`} role="status">
          <Icon name={reading.read_ok ? 'check' : 'alert'} size={20} />
          <span>{reading.read_ok ? 'قرينا الإيصال. راجع البيانات تحت وصلّحها لو في حاجة غلط.' : 'ما قدرناش نقرا الإيصال كويس. اكتب البيانات بإيدك.'}</span>
        </div>
        {reading.note && <p class="muted">{reading.note}</p>}
        <Button
          variant="ghost"
          icon="close"
          onClick={() => {
            setPreview(null);
            onClear();
          }}
        >
          غيّر الصورة
        </Button>
      </div>
    );
  }

  return (
    <div class="stack">
      <label class="picker">
        <Icon name="camera" size={30} />
        <span>{label}</span>
        <input type="file" accept="image/*" onChange={(e) => pick(e.currentTarget.files?.[0])} />
      </label>
      <ErrorMessage error={err || error} />
    </div>
  );
}

/** زرار "شوف الإيصال": بيجيب الصورة من receipt ويعرضها */
export function ReceiptButton({ receiptId, label = 'شوف الإيصال' }: { receiptId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" icon="image" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && <ReceiptOverlay receiptId={receiptId} onClose={() => setOpen(false)} />}
    </>
  );
}

const cache = new Map<string, string>();

function ReceiptOverlay({ receiptId, onClose }: { receiptId: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(cache.get(receiptId) ?? null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (src) return;
    call('receipt', { receipt_id: receiptId })
      .then((r) => {
        cache.set(receiptId, r.src);
        setSrc(r.src);
      })
      .catch((e: Error) => setErr(e.message));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receiptId]);
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label="الإيصال" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="overlay__panel">
        <div class="section-title">
          <span>الإيصال</span>
          <Button variant="ghost" icon="close" onClick={onClose}>
            اقفل
          </Button>
        </div>
        {src ? <img class="overlay__img" src={src} alt="صورة الإيصال" /> : err ? <ErrorMessage error={err} /> : <Loading text="بنجيب الإيصال..." />}
      </div>
    </div>
  );
}
