import type { ComponentChildren, JSX } from 'preact';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'on-primary';

interface Props extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'loading' | 'type'> {
  variant?: Variant;
  block?: boolean;
  /** بيقفل الزرار ويكتب "لحظة..." (أو loadingText) */
  loading?: boolean;
  loadingText?: string;
  icon?: IconName;
  type?: 'button' | 'submit';
  children: ComponentChildren;
}

/** زرار: 44px على الأقل، والأساسي 56px. حالة الضغط بتبان فوراً (CSS :active). */
export function Button({ variant = 'primary', block, loading, loadingText = 'لحظة...', icon, type = 'button', children, class: cls, disabled, ...rest }: Props) {
  const classes = ['btn', `btn--${variant}`, block && 'btn--block', cls].filter(Boolean).join(' ');
  return (
    <button {...rest} type={type} class={classes} disabled={disabled || loading} aria-busy={loading ? 'true' : undefined}>
      {loading ? <span class="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={20} /> : null}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}

/** لينك شكله زرار (للتنقل) */
export function LinkButton({ href, variant = 'secondary', block, icon, children, ...rest }: { href: string; variant?: Variant; block?: boolean; icon?: IconName; children: ComponentChildren } & JSX.HTMLAttributes<HTMLAnchorElement>) {
  const classes = ['btn', `btn--${variant}`, block && 'btn--block'].filter(Boolean).join(' ');
  return (
    <a {...rest} href={href} class={classes}>
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </a>
  );
}
