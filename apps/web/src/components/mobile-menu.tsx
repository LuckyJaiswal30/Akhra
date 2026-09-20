'use client';

import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from './nav-links';

export function MobileMenu({
  items,
  labels,
  children,
}: {
  items: readonly NavItem[];
  labels: { open: string; close: string; menu: string };
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? labels.close : labels.open}
        onClick={() => setOpen((value) => !value)}
        className="border-line text-ink hover:bg-mint grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors xl:hidden"
      >
        {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
      </button>

      <div
        id={id}
        hidden={!open}
        className="border-line bg-surface shadow-card absolute inset-x-0 top-full z-40 border-b xl:hidden"
      >
        <nav aria-label={labels.menu} className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
          <ul className="divide-line divide-y">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center justify-between gap-3 text-[15px] font-medium',
                    pathname === item.href ? 'text-sal' : 'text-ink',
                  )}
                >
                  {item.label}
                  <ArrowRight aria-hidden className="text-subtle h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
          {children && <div className="border-line border-t py-3">{children}</div>}
        </nav>
      </div>
    </>
  );
}
