import type { ComponentChildren } from 'preact';

export function Card({ title, hero, children, class: cls, ...rest }: { title?: ComponentChildren; hero?: boolean; children?: ComponentChildren; class?: string; [k: string]: unknown }) {
  return (
    <section {...rest} class={['card', hero && 'card--hero', cls].filter(Boolean).join(' ')}>
      {title && <h2 class="card__title">{title}</h2>}
      {children}
    </section>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div class="progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
