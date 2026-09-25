import { ArrowRight, CalendarClock, Languages, MapPin, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AkhraLogo } from '@/components/brand/akhra-logo';
import { JharkhandLandscape } from '@/components/illustrations/jharkhand-landscape';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/navigation';
import { formatNumber } from '@/lib/utils';
import { getPlatformStats } from '@/modules/analytics';

export async function AuthShell({
  children,
  locale,
  trustNote = true,
}: {
  children: ReactNode;
  locale: string;
  trustNote?: boolean;
}) {
  const t = await getTranslations();
  const stats = await getPlatformStats();
  const number = (value: number) => formatNumber(value, locale === 'hi' ? 'hi-IN' : 'en-IN');

  const features = [
    { Icon: CalendarClock, label: t('auth.featureDeadline') },
    { Icon: MapPin, label: t('auth.featureDistricts') },
    { Icon: Languages, label: t('auth.featureLanguages') },
  ];
  const figures = [
    { value: stats.totalProblems, label: t('auth.statChallenges') },
    { value: stats.districtsCovered, label: t('auth.statDistricts') },
    { value: stats.participatingInstitutions, label: t('auth.statInstitutions') },
    { value: stats.solutionsDeployed, label: t('auth.statDeployed') },
  ];
  return (
    <div className="grid flex-1 lg:min-h-dvh lg:grid-cols-2">
      <aside
        aria-label={t('auth.heroLabel')}
        className="bg-mint relative hidden flex-col overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start"
      >
        <div className="relative z-10 px-10 pt-8 xl:px-14">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-md">
            <AkhraLogo name={t('brand.name')} tagline={t('brand.slogan')} />
          </Link>
        </div>

        <div className="relative z-10 px-10 pt-10 xl:px-14 xl:pt-14">
          <p className="text-ink text-5xl leading-[1.05] font-bold xl:text-6xl">
            {t('auth.heroLine1')}
            <br />
            <span className="text-sal">{t('auth.heroLine2')}</span>
          </p>
          <p className="text-subtle mt-6 text-lg">{t('auth.heroBody')}</p>
          <ul className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
            {features.map(({ Icon, label }) => (
              <li
                key={label}
                className="text-ink flex items-center gap-3 text-sm font-medium whitespace-nowrap"
              >
                <span className="bg-sal-wash text-sal grid h-11 w-11 shrink-0 place-items-center rounded-full">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className="[@media(max-height:820px)]:hidden">
            <span aria-hidden className="bg-sal mt-7 block h-1 w-12 rounded-full" />
            <p className="text-subtle mt-4 text-lg italic">{t('auth.heroQuote')}</p>
          </div>
        </div>

        <div className="relative mt-6 min-h-60 flex-1">
          <JharkhandLandscape />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-b from-transparent via-[#0f2e1e]/45 to-[#0f2e1e]/95"
          />
          <div className="absolute inset-x-0 bottom-0 px-10 pb-9 text-white xl:px-14">
            <div className="hidden 2xl:block">
              <span aria-hidden className="block h-0.5 w-12 bg-white/80" />
              <p className="mt-4 font-medium">
                {t('auth.heroFooter1')}
                <br />
                {t('auth.heroFooter2')}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-y-3 2xl:mt-6 2xl:grid-cols-4 2xl:divide-x 2xl:divide-white/30">
              {figures.map((figure) => (
                <div key={figure.label} className="flex flex-col-reverse 2xl:px-4 2xl:first:pl-0">
                  <dt className="mt-1 text-sm whitespace-nowrap text-white/85">{figure.label}</dt>
                  <dd className="text-2xl font-bold tabular-nums">{number(figure.value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>

      <div className="bg-surface flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:justify-end lg:py-6">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-md lg:hidden">
            <span className="sm:hidden">
              <AkhraLogo name={t('brand.name')} tagline={t('brand.slogan')} compact />
            </span>
            <span className="hidden sm:inline">
              <AkhraLogo name={t('brand.name')} tagline={t('brand.slogan')} />
            </span>
          </Link>
          <LocaleSwitcher label={t('nav.language')} />
        </header>

        <div className="flex flex-1 flex-col items-center px-4 pb-10 sm:px-8 lg:justify-center">
          <div className="w-full max-w-[34rem] space-y-5">
            {children}
            {trustNote && (
              <section className="border-line bg-mint flex items-start gap-4 rounded-2xl border p-5">
                <span className="bg-sal-wash text-sal grid h-11 w-11 shrink-0 place-items-center rounded-full">
                  <ShieldCheck aria-hidden className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-ink font-semibold">{t('auth.trustNoteTitle')}</h2>
                  <p className="text-subtle mt-1 text-sm">{t('auth.trustNoteBody')}</p>
                </div>
                <Link
                  href="/privacy"
                  className="text-sal inline-flex min-h-11 shrink-0 items-center gap-1 self-center text-sm font-semibold underline-offset-4 hover:underline"
                >
                  {t('auth.learnMore')}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
