import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { normalizeDigits, onlyDigits } from '../lib/digits';
import { Icon } from './Icon';

type Kind = 'text' | 'digits' | 'amount' | 'phone' | 'email' | 'code' | 'textarea';

interface Props {
  label: string;
  value: string;
  onInput: (value: string) => void;
  kind?: Kind;
  hint?: string;
  /** الغلط بالعامية، وبيقول يتصلح إزاي */
  error?: string | null;
  maxLength?: number;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  name?: string;
  placeholder?: string;
  rows?: number;
}

/**
 * حقل: الـ label فوق (مش placeholder بس)، والغلط تحته جنب الحقل.
 * - digits/phone: inputmode=numeric، بيقبل ٠-٩ ويحوّلها، واتجاهه ltr.
 * - amount: inputmode=decimal، بيقبل أرقام عربي.
 * - code: كود عمارة زي TEST14 (حروف كبيرة، ltr، من غير مسافات).
 */
export function Field({ label, value, onInput, kind = 'text', hint, error, maxLength, required, autoComplete, autoFocus, name, placeholder, rows = 3 }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(' ') || undefined;
  const ltr = kind === 'digits' || kind === 'phone' || kind === 'amount' || kind === 'email' || kind === 'code';

  const clean = (raw: string): string => {
    if (kind === 'digits' || kind === 'phone') {
      const d = onlyDigits(raw);
      return maxLength ? d.slice(0, maxLength) : d;
    }
    if (kind === 'code') return normalizeDigits(raw).toUpperCase().replace(/\s+/g, '').slice(0, maxLength ?? 40);
    if (kind === 'amount') return normalizeDigits(raw).replace(/[^\d.,٫٬]/g, '');
    return raw;
  };

  const common = {
    id,
    name,
    value,
    required,
    autoFocus,
    placeholder,
    'aria-invalid': error ? ('true' as const) : undefined,
    'aria-describedby': describedBy,
    class: `field__input${ltr ? ' field__input--ltr' : ''}`
  };

  const onIn = (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const next = clean(el.value);
    if (next !== el.value) el.value = next;
    onInput(next);
  };

  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      {hint && (
        <span class="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {kind === 'textarea' ? (
        <textarea {...common} rows={rows} maxLength={maxLength} onInput={onIn} />
      ) : (
        <input
          {...common}
          type={kind === 'email' ? 'email' : kind === 'phone' ? 'tel' : 'text'}
          inputMode={kind === 'digits' || kind === 'phone' ? 'numeric' : kind === 'amount' ? 'decimal' : kind === 'email' ? 'email' : undefined}
          dir={ltr ? 'ltr' : undefined}
          maxLength={kind === 'digits' || kind === 'phone' ? undefined : maxLength}
          autoComplete={autoComplete}
          autoCapitalize={kind === 'code' ? 'characters' : undefined}
          spellcheck={ltr ? false : undefined}
          onInput={onIn}
        />
      )}
      {error && (
        <span class="field__error" id={errId} role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}
