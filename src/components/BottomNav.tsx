import { Icon, type IconName } from './Icon';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  href: string;
}

/** شريط تحت: 5 تابات بالكتير، كل تاب أيقونة + كلمة */
export function BottomNav({ items, active }: { items: NavItem[]; active: string }) {
  if (items.length > 5) throw new Error('BottomNav: 5 تابات بالكتير');
  return (
    <nav class="bottom-nav" aria-label="القائمة الرئيسية">
      <div class="bottom-nav__inner">
        {items.map((it) => (
          <a key={it.key} href={it.href} class="bottom-nav__item" aria-current={it.key === active ? 'page' : undefined}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            <span class="bottom-nav__dot" aria-hidden="true" />
          </a>
        ))}
      </div>
    </nav>
  );
}
