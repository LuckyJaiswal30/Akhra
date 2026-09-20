import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StatTile } from '@/modules/analytics';
import {
  DepartmentBoard,
  departmentName,
  departmentReports,
  departmentStats,
  type DepartmentBucket,
} from '@/modules/classification';
import { Link } from '@/i18n/navigation';
import { getActor, requirePageRole } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const [{ locale }, actor] = await Promise.all([params, getActor()]);
  const t = await getTranslations({ locale, namespace: 'department' });
  const name = actor.organizationId ? await departmentName(actor.organizationId) : null;
  return { title: name ? t('title', { department: name }) : t('genericTitle') };
}

const BUCKETS: DepartmentBucket[] = ['open', 'awaiting', 'closed'];

export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const [{ locale }, { stage }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const actor = await requirePageRole('dept_officer');
  const [t, tq] = await Promise.all([getTranslations('department'), getTranslations('queue')]);

  const bucket: DepartmentBucket = BUCKETS.includes(stage as DepartmentBucket)
    ? (stage as DepartmentBucket)
    : 'open';

  const [name, stats, reports] = await Promise.all([
    actor.organizationId ? departmentName(actor.organizationId) : null,
    departmentStats(actor),
    departmentReports(actor, bucket),
  ]);

  const labels: Record<string, string> = {
    empty: t('empty'),
    dueOn: tq('dueOn'),
    overdue: tq('overdue'),
    reopened: tq('reopened'),
    reporterSaid: tq('reporterSaid'),
    actionTakenLabel: tq('actionTakenLabel'),
    actionTakenTitle: tq('actionTakenTitle'),
    actionTakenHint: tq('actionTakenHint'),
    actionTakenPlaceholder: tq('actionTakenPlaceholder'),
    recordActionTaken: tq('recordActionTaken'),
    saving: tq('saving'),
  };

  const hint = { open: t('openHint'), awaiting: t('awaitingHint'), closed: t('closedHint') }[
    bucket
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {name ? t('title', { department: name }) : t('genericTitle')}
        </h1>
        <p className="text-subtle mt-1 text-sm">{t('subtitle')}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label={t('statOpen')} value={String(stats.open)} />
        <StatTile label={t('statOverdue')} value={String(stats.overdue)} />
        <StatTile label={t('statAwaiting')} value={String(stats.awaiting)} />
        <StatTile label={t('statClosed')} value={String(stats.closed)} />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label={t('genericTitle')}>
        {BUCKETS.map((value) => (
          <Link
            key={value}
            href={{ pathname: '/department', query: { stage: value } }}
            aria-current={bucket === value ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
              bucket === value
                ? 'bg-sal text-on-sal'
                : 'border-line bg-surface text-ink hover:bg-mint border'
            }`}
          >
            {t(value === 'open' ? 'tabOpen' : value === 'awaiting' ? 'tabAwaiting' : 'tabClosed')}
          </Link>
        ))}
      </nav>

      <p className="text-subtle text-sm">{hint}</p>

      <DepartmentBoard reports={reports} bucket={bucket} locale={locale} labels={labels} />

      <p className="text-subtle border-line border-t pt-4 text-xs">{t('scopeNote')}</p>
    </div>
  );
}
