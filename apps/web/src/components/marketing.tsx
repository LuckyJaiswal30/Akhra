import { ChartColumnIncreasing, CircleCheckBig, Landmark, Lightbulb, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import type { PlatformStats } from '@/modules/analytics';

function formatCount(value: number, locale: string): string {
  const tag = locale === 'hi' ? 'hi-IN' : 'en-IN';
  if (value < 10_000) return new Intl.NumberFormat(tag).format(value);
  const options = {
    notation: 'compact',
    maximumFractionDigits: 0,
    roundingMode: 'floor',
  } as Intl.NumberFormatOptions;
  return `${new Intl.NumberFormat(locale === 'hi' ? 'hi-IN' : 'en-US', options).format(value)}+`;
}

export function PageIntro({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-line bg-mint border-b">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <h1 className="text-ink text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-subtle mt-4 text-lg">{intro}</p>
        {children}
      </div>
    </section>
  );
}

export async function StatsBand({
  stats,
  locale,
  note,
}: {
  stats: PlatformStats;
  locale: string;
  note?: string;
}) {
  const t = await getTranslations('landing');
  const items = [
    { Icon: Users, value: stats.totalProblems, label: t('statChallenges') },
    { Icon: Lightbulb, value: stats.activeProjects, label: t('statProjects') },
    { Icon: Landmark, value: stats.participatingInstitutions, label: t('statInstitutions') },
    { Icon: CircleCheckBig, value: stats.solutionsDeployed, label: t('statDeployed') },
    { Icon: ChartColumnIncreasing, value: stats.peopleImpacted, label: t('statPeople') },
  ];

  return (
    <section aria-label={t('statsLabel')} className="border-line bg-mint border-y">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-y-6 xl:grid-cols-5">
          {items.map(({ Icon, value, label }) => (
            <li
              key={label}
              className="xl:border-line flex items-center gap-3.5 xl:border-r xl:px-5 xl:first:pl-0"
            >
              <Icon aria-hidden className="text-sal h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
              <p className="flex flex-col">
                <span className="text-ink text-xl font-bold tabular-nums sm:text-2xl">
                  {formatCount(value, locale)}
                </span>
                <span className="text-subtle text-sm">{label}</span>
              </p>
            </li>
          ))}
        </ul>
        {note && <p className="text-warning mt-4 text-sm font-medium">{note}</p>}
      </div>
    </section>
  );
}
