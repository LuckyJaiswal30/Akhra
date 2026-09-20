import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DOMAIN_DEFINITIONS, ROLE_HOME_PATH, type Domain, type ProblemStatus } from '@akhra/shared';
import { listOwnReports } from '@/modules/citizen';
import { Link, redirect } from '@/i18n/navigation';
import { buttonVariants, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { requireActor } from '@/server/session';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireActor();
  // Everyone but a citizen works somewhere else; one table decides where, so a new role can never
  // land here by accident and be shown a citizen's page.
  if (actor.role !== 'citizen' && actor.role !== 'anonymous') {
    redirect({ href: ROLE_HOME_PATH[actor.role], locale });
  }

  const t = await getTranslations('dashboard');
  const reports = await listOwnReports(actor);
  const isHindi = locale === 'hi';

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('yourReports')}</h1>
          <p className="text-subtle mt-1">{actor.name ?? actor.email}</p>
        </div>
        <Link href="/submit" className={buttonVariants({ size: 'lg' })}>
          {t('reportNew')}
        </Link>
      </header>

      {reports.length === 0 ? (
        <p className="border-line text-subtle mt-8 border-y py-10 text-center">{t('noReports')}</p>
      ) : (
        <ul className="divide-line border-line mt-8 divide-y border-y">
          {reports.map((report) => {
            const domain = report.domain ? DOMAIN_DEFINITIONS[report.domain as Domain] : null;
            return (
              <li key={report.id}>
                <Link
                  href={{ pathname: '/track', query: { ref: report.refCode } }}
                  className="hover:bg-well block py-4 transition-colors sm:-mx-3 sm:px-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-subtle font-mono text-sm">{report.refCode}</span>
                    <StatusBadge status={report.status as ProblemStatus} locale={locale} />
                  </div>
                  <h2 className="text-ink mt-1 font-medium">{report.title}</h2>
                  <p className="text-subtle mt-1 text-sm">
                    {[
                      report.districtName,
                      domain ? (isHindi ? domain.labelHi : domain.labelEn) : null,
                      formatDate(report.createdAt, isHindi ? 'hi-IN' : 'en-IN'),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
