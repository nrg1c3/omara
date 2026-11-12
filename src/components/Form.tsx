import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { Icon } from './Icon';

function FieldShell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string | null; children: ComponentChildren }) {
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      {hint && <span class="field__hint">{hint}</span>}
      {children}
      {error && (
        <span class="field__error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, error, hint, placeholder = 'اختار...' }: { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; error?: string | null; hint?: string; placeholder?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} class="field__input field__select" value={value} aria-invalid={error ? 'true' : undefined} onChange={(e) => onChange(e.currentTarget.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </FieldShell>
  );
}

export function DateField({ label, value, onChange, error, type = 'date', hint }: { label: string; value: string; onChange: (v: string) => void; error?: string | null; type?: 'date' | 'month'; hint?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input id={id} type={type} dir="ltr" class="field__input field__input--ltr" value={value} aria-invalid={error ? 'true' : undefined} onInput={(e) => onChange(e.currentTarget.value)} />
    </FieldShell>
  );
}

/** اختيار من كذا حاجة (أزرار كبيرة بدل dropdown لما الاختيارات قليلة) */
export function Choice<T extends string>({ label, value, onChange, options, error }: { label: string; value: T | ''; onChange: (v: T) => void; options: { value: T; label: string }[]; error?: string | null }) {
  return (
    <fieldset class="field choice">
      <legend class="field__label">{label}</legend>
      <div class="choice__row">
        {options.map((o) => (
          <button key={o.value} type="button" class="choice__item" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {value === o.value && <Icon name="check" size={18} />}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      {error && (
        <span class="field__error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </span>
      )}
    </fieldset>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <label class="toggle" for={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span class="toggle__box" aria-hidden="true">
        <Icon name="check" size={16} />
      </span>
      <span class="stack" style={{ gap: '2px' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {hint && <span class="field__hint">{hint}</span>}
      </span>
    </label>
  );
}
