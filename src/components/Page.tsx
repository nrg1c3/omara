import type { ComponentChildren } from 'preact';
import { Icon, type IconName } from './Icon';

/** عنوان صفحة فرعية بزرار رجوع */
export function PageHeader({ title, back, subtitle, action }: { title: string; back?: string; subtitle?: string; action?: ComponentChildren }) {
  return (
    <header class="page-header">
      {back && (
        <a class="page-header__back" href={back}>
          <Icon name="arrowBack" size={22} />
          <span>رجوع</span>
        </a>
      )}
      <div class="screen__header">
        <div class="stack" style={{ gap: '2px', minWidth: 0 }}>
          <h1 class="screen__title">{title}</h1>
          {subtitle && <p class="screen__subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Empty({ icon = 'list', children }: { icon?: IconName; children: ComponentChildren }) {
  return (
    <div class="empty">
      <Icon name={icon} size={28} />
      <p>{children}</p>
    </div>
  );
}

/** صف في قايمة: عنوان + تفاصيل + قيمة على الشمال */
export function Row({ title, meta, value, badge, children, href }: { title: ComponentChildren; meta?: ComponentChildren; value?: ComponentChildren; badge?: ComponentChildren; children?: ComponentChildren; href?: string }) {
  const inner = (
    <>
      <div class="list-row__main">
        <div class="list-row__text">
          <span class="list-row__title">{title}</span>
          {meta && <span class="list-row__meta">{meta}</span>}
        </div>
        {(value || badge) && (
          <div class="list-row__side">
            {value && <span class="list-row__value num">{value}</span>}
            {badge}
          </div>
        )}
      </div>
      {children}
    </>
  );
  return href ? (
    <a class="list-row list-row--link" href={href}>
      {inner}
    </a>
  ) : (
    <div class="list-row">{inner}</div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'warn' | 'success' | 'neutral' | 'danger'; children: ComponentChildren }) {
  return <span class={`badge badge--${tone}`}>{children}</span>;
}

/** فهرس روابط (للمزيد) */
export function MenuLink({ href, icon, label, note, onClick }: { href?: string; icon: IconName; label: string; note?: ComponentChildren; onClick?: () => void }) {
  const body = (
    <>
      <Icon name={icon} size={22} />
      <span class="menu-link__label">{label}</span>
      {note && <span class="menu-link__note">{note}</span>}
      <span class="menu-link__chev" aria-hidden="true">
        <Icon name="chevron" size={18} />
      </span>
    </>
  );
  return href ? (
    <a class="menu-link" href={href}>
      {body}
    </a>
  ) : (
    <button type="button" class="menu-link" onClick={onClick}>
      {body}
    </button>
  );
}
