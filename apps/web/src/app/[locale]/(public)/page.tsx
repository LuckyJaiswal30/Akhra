import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StatsBand } from '@/components/marketing';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { getPlatformStats } from '@/modules/analytics';
import { DASHBOARD_HREF } from '@/components/workspace';
import { serverEnv } from '@/server/env';
import { getActor } from '@/server/session';

const STEPS = ['Report', 'Sort', 'Decide', 'Solve', 'Close'] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const [stats, actor] = await Promise.all([getPlatformStats(), getActor()]);
  const role = actor.userId && actor.role !== 'anonymous' ? actor.role : null;

  return (
    <>
      <section className="bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 lg:py-20">
          <h1 className="text-ink text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            {t('titleLine1')} <span className="text-sal">{t('titleLine2')}</span>
          </h1>
          <p className="text-subtle mx-auto mt-5 max-w-2xl text-lg">{t('intro')}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {role ? (
              <Link href={DASHBOARD_HREF[role]} className={buttonVariants({ size: 'lg' })}>
                {t('goDashboard')}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/submit" className={buttonVariants({ size: 'lg' })}>
                {t('reportCta')}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            )}
            <Link href="/problems" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
              {t('browseCta')}
            </Link>
          </div>
          {role ? (
            <Link
              href="/submit"
              className="text-sal mt-4 inline-block text-sm font-medium underline"
            >
              {role === 'citizen' ? t('reportCta') : t('reportForOffice')}
            </Link>
          ) : (
            <p className="text-subtle mt-3 text-sm">{t('reportNote')}</p>
          )}
        </div>
      </section>

      <StatsBand
        stats={stats}
        locale={locale}
        note={serverEnv.ALLOW_SEED ? t('sampleData') : undefined}
      />

      <section aria-labelledby="how" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="how" className="text-ink text-2xl font-bold">
          {t('howTitle')}
        </h2>
        <ol className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-5">
          {STEPS.map((key, index) => (
            <li key={key} className="border-sal border-t-2 pt-3">
              <p className="text-ink font-semibold">
                <span className="text-subtle mr-1.5 tabular-nums">{index + 1}.</span>
                {t(`step${key}Title`)}
              </p>
              <p className="text-subtle mt-1 text-sm">{t(`step${key}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
