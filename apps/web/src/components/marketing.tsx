import {
  Building2,
  ChartColumnIncreasing,
  CircleCheckBig,
  GraduationCap,
  Landmark,
  Lightbulb,
  Users,
} from 'lucide-react';
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

export async function StatsBand({ stats, locale }: { stats: PlatformStats; locale: string }) {
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
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:grid-cols-3 sm:gap-y-6 sm:px-6 sm:py-7 lg:px-8 xl:grid-cols-5">
        <dl className="contents">
          {items.map(({ Icon, value, label }) => (
            <div
              key={label}
              className="xl:border-line flex items-center gap-3.5 xl:border-r xl:px-5 xl:first:pl-0"
            >
              <Icon aria-hidden className="text-sal h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
              <div className="flex flex-col-reverse">
                <dt className="text-subtle text-sm">{label}</dt>
                <dd className="text-ink text-xl font-bold tabular-nums sm:text-2xl">
                  {formatCount(value, locale)}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * Who stands behind Akhra. It is a statement, not navigation: every one of these four already has
 * its place in the platform — a citizen reports, everyone else signs in and lands on their own desk.
 */
export async function PartnerStrip() {
  const t = await getTranslations('landing');
  const partners = [
    { Icon: Landmark, label: t('partnerGov') },
    { Icon: GraduationCap, label: t('partnerUniversities') },
    { Icon: Building2, label: t('partnerIndustry') },
    { Icon: Users, label: t('partnerCommunities') },
  ] as const;

  return (
    <section aria-labelledby="partners-heading" className="border-line bg-surface border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <h2
          id="partners-heading"
          className="text-subtle lg:border-line shrink-0 text-sm lg:border-r lg:pr-8"
        >
          {t('partnersLabel')}
        </h2>
        <ul className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-4">
          {partners.map(({ Icon, label }) => (
            <li key={label} className="text-ink flex items-center gap-3 text-sm font-medium">
              <span className="border-line text-sal grid h-12 w-12 shrink-0 place-items-center rounded-full border">
                <Icon aria-hidden className="h-6 w-6" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
