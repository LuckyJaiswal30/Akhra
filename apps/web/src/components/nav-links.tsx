'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type SiteHref =
  | '/how-it-works'
  | '/success-stories'
  | '/impact'
  | '/resources'
  | '/track'
  | '/dashboard'
  | '/admin'
  | '/government'
  | '/department'
  | '/university'
  | '/university/projects'
  | '/industry';

export interface NavItem {
  href: SiteHref;
  label: string;
  primary?: boolean;
}

export function NavLinks({
  items,
  label,
  className,
  mobile = false,
}: {
  items: readonly NavItem[];
  label: string;
  className?: string;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: SiteHref) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label={label} className={className}>
      <ul
        className={cn('flex', mobile ? 'gap-6 overflow-x-auto px-4 sm:px-6' : 'items-center gap-8')}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'hover:text-sal relative inline-flex items-center text-sm whitespace-nowrap transition-colors',
                  item.primary ? 'font-semibold' : 'font-medium',
                  mobile ? 'h-11' : 'h-[76px]',
                  active
                    ? 'text-sal after:bg-sal after:absolute after:inset-x-0 after:h-0.5 after:rounded-full'
                    : 'text-ink',
                  active && (mobile ? 'after:bottom-1' : 'after:bottom-5'),
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
