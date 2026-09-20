'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { ChevronDown, LogOut, UserCog } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
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
        className="hover:bg-well flex items-center gap-2.5 rounded-full p-0.5 transition-colors lg:pr-3"
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={40}
            height={40}
            className="bg-sal-wash h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="bg-sal-wash text-sal grid h-10 w-10 place-items-center rounded-full font-semibold"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden text-left leading-tight lg:block">
          <span className="text-ink block max-w-40 truncate text-sm font-medium">
            {displayName}
          </span>
          <span className="text-subtle block text-xs">{roleLabel}</span>
        </span>
        <ChevronDown aria-hidden className="text-subtle hidden h-4 w-4 lg:block" />
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
            <p className="text-subtle text-xs">{roleLabel}</p>
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
