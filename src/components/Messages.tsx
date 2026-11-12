import type { ComponentChildren } from 'preact';
import { Icon, type IconName } from './Icon';

type Tone = 'error' | 'warn' | 'success' | 'info';
const ICON: Record<Tone, IconName> = { error: 'alert', warn: 'alert', success: 'check', info: 'bell' };

/** رسالة: لون + أيقونة + كلمة (ما بنعتمدش على اللون لوحده) */
export function Alert({ tone = 'error', children, title }: { tone?: Tone; children: ComponentChildren; title?: string }) {
  return (
    <div class={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ICON[tone]} size={20} />
      <div>
        {title && <strong>{title} </strong>}
        {children}
      </div>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }: { error: string | null | undefined; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div class="alert alert--error" role="alert">
      <Icon name="alert" size={20} />
      <div class="stack" style={{ gap: '8px' }}>
        <span>{error}</span>
        {onRetry && (
          <button type="button" class="btn btn--secondary" onClick={onRetry} style={{ alignSelf: 'flex-start' }}>
            جرّب تاني
          </button>
        )}
      </div>
    </div>
  );
}
