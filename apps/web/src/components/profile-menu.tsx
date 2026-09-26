'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { LogOut, UserCog } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { CAPSULE_WIDTH } from './header-capsule';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export function ProfileMenu({
  name,
  roleLabel,
  labels,
}: {
  name: string;
  roleLabel: string;
  labels: { menu: string; manage: string; signOut: string };
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName || name;
  const image = user?.imageUrl;

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
      if (event.key === 'Escape') buttonRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.menu}
        onClick={() => setOpen((value) => !value)}
        title={`${displayName} · ${roleLabel}`}
        className={`hover:bg-well flex h-11 items-center gap-2 rounded-full p-0.5 transition-colors ${CAPSULE_WIDTH} lg:border-line lg:border lg:p-1 lg:pr-3`}
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={40}
            height={40}
            className="bg-sal-wash h-10 w-10 shrink-0 rounded-full object-cover lg:h-8 lg:w-8"
          />
        ) : (
          <span
            aria-hidden
            className="bg-sal-wash text-sal grid h-10 w-10 shrink-0 place-items-center rounded-full font-semibold lg:h-8 lg:w-8 lg:text-sm"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden min-w-0 flex-1 text-left leading-tight lg:block">
          <span className="text-ink block truncate text-sm font-medium">{displayName}</span>
          <span className="text-subtle block truncate text-xs">{roleLabel}</span>
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={labels.menu}
          onKeyDown={onMenuKey}
          className="border-line bg-surface shadow-raised absolute top-full right-0 z-50 mt-2 w-60 rounded-xl border p-1.5"
        >
          <div className="border-line border-b px-3 pt-1.5 pb-2.5 lg:hidden">
            <p className="text-ink truncate text-sm font-medium">{displayName}</p>
            <p className="text-subtle truncate text-xs">{roleLabel}</p>
          </div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="text-ink hover:bg-well focus-visible:bg-well flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm outline-none"
          >
            <UserCog aria-hidden className="text-subtle h-4 w-4" />
            {labels.manage}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut({ redirectUrl: '/' })}
            className="text-ink hover:bg-well focus-visible:bg-well flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm outline-none"
          >
            <LogOut aria-hidden className="text-subtle h-4 w-4" />
            {labels.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
