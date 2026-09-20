'use client';

import type { ComponentProps } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export interface DashboardNavItem {
  href: ComponentProps<typeof Link>['href'] & string;
  label: string;
}

export function DashboardNav({ label, items }: { label: string; items: DashboardNavItem[] }) {
  const pathname = usePathname();
  const home = items[0]?.href;
  const isActive = (href: string) =>
    pathname === href || (href !== home && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={label}>
      <ul className="border-line -mx-4 flex overflow-x-auto border-b px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:px-0">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center border-b-2 px-3 text-sm whitespace-nowrap transition-colors lg:h-10 lg:rounded-r-md lg:border-b-0 lg:border-l-2',
                  active
                    ? 'border-sal text-ink lg:bg-well font-medium'
                    : 'text-subtle hover:text-ink lg:hover:bg-well border-transparent',
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
