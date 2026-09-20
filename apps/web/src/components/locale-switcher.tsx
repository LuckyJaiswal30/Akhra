'use client';

import { ChevronDown, Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALES } from '@/i18n/routing';

const LOCALE_LABELS: Record<string, string> = { en: 'English', hi: 'हिंदी' };
const SHORT_LABELS: Record<string, string> = { en: 'EN', hi: 'हि' };

export function LocaleSwitcher({ label, compact = false }: { label: string; compact?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <Globe
        aria-hidden
        className={`text-subtle pointer-events-none absolute h-4 w-4 ${compact ? 'left-3' : 'left-3.5'}`}
      />
      <select
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(() => {
            router.replace(pathname, { locale: next as (typeof LOCALES)[number] });
          });
        }}
        className={`border-line bg-surface text-ink hover:border-field h-11 cursor-pointer appearance-none rounded-full border text-sm font-medium transition-colors ${compact ? 'pr-7 pl-9' : 'pr-9 pl-10'}`}
      >
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {(compact ? SHORT_LABELS : LOCALE_LABELS)[value] ?? value}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className={`text-subtle pointer-events-none absolute h-4 w-4 ${compact ? 'right-2.5' : 'right-3.5'}`}
      />
    </label>
  );
}
