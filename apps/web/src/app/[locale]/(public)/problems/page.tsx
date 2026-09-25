import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  DOMAIN_DEFINITIONS,
  DOMAIN_LIST,
  JHARKHAND_DISTRICTS,
  PROBLEM_STATUSES,
  STATUS_DEFINITIONS,
  problemFilterSchema,
  type Domain,
  type ProblemStatus,
} from '@akhra/shared';
import { listProblems } from '@/modules/citizen';
import { Link } from '@/i18n/navigation';
import { getActor } from '@/server/session';
import { Button, Field, Input, Select, StatusBadge, buttonVariants } from '@/components/ui';
import { MobileCollapsible } from '@/components/mobile-collapsible';
import { formatDate } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'problems' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function ProblemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ locale }, rawSearch] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const t = await getTranslations('problems');
  const isHindi = locale === 'hi';

  const filter = problemFilterSchema.parse(rawSearch);

  const actor = await getActor();
  let { items, total } = await listProblems(actor, filter);
  const pageCount = Math.ceil(total / filter.pageSize);
  if (items.length === 0 && filter.page > pageCount && pageCount > 0) {
    filter.page = pageCount;
    ({ items, total } = await listProblems(actor, filter));
  }
  const pageQuery = (page: number) =>
    Object.fromEntries(
      Object.entries({
        q: filter.q,
        domain: filter.domain,
        districtCode: filter.districtCode,
        status: filter.status,
        page: String(page),
      }).filter(([, value]) => value),
    ) as Record<string, string>;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-subtle mt-2">{t('subtitle')}</p>
        </div>
        <Link href="/submit" className={buttonVariants({})}>
          {t('reportNew')}
        </Link>
      </div>

      <form
        method="get"
        className="border-line mt-8 grid gap-4 border-y py-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end"
      >
        <Field label={t('search')} htmlFor="q">
          <Input id="q" name="q" type="search" defaultValue={filter.q ?? ''} />
        </Field>
        <MobileCollapsible
          label={t('filters')}
          count={[filter.domain, filter.districtCode, filter.status].filter(Boolean).length}
          defaultOpen={Boolean(filter.domain || filter.districtCode || filter.status)}
          inline
        >
          <Field label={t('filterDomain')} htmlFor="domain">
            <Select id="domain" name="domain" defaultValue={filter.domain ?? ''}>
              <option value="">{t('all')}</option>
              {DOMAIN_LIST.map((d) => (
                <option key={d.id} value={d.id}>
                  {isHindi ? d.labelHi : d.labelEn}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('filterDistrict')} htmlFor="districtCode">
            <Select id="districtCode" name="districtCode" defaultValue={filter.districtCode ?? ''}>
              <option value="">{t('all')}</option>
              {JHARKHAND_DISTRICTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {isHindi ? d.nameHi : d.nameEn}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('filterStatus')} htmlFor="status">
            <Select id="status" name="status" defaultValue={filter.status ?? ''}>
              <option value="">{t('all')}</option>
              {PROBLEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {isHindi ? STATUS_DEFINITIONS[s].labelHi : STATUS_DEFINITIONS[s].labelEn}
                </option>
              ))}
            </Select>
          </Field>
        </MobileCollapsible>
        <Button type="submit" className="min-h-11 sm:min-h-10">
          {t('search')}
        </Button>
      </form>

      <p className="text-subtle mt-6 text-sm" aria-live="polite">
        {t('resultCount', { count: total })}
      </p>

      {items.length === 0 ? (
        <p className="border-line text-subtle mt-4 border-y py-10 text-center">{t('empty')}</p>
      ) : (
        <ul className="divide-line border-line mt-3 divide-y border-y">
          {items.map((problem) => (
            <li key={problem.id}>
              <Link
                href={{ pathname: '/track', query: { ref: problem.refCode } }}
                className="hover:bg-well block py-4 transition-colors sm:-mx-3 sm:px-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-subtle font-mono text-sm">{problem.refCode}</span>
                  <StatusBadge status={problem.status as ProblemStatus} locale={locale} />
                </div>
                <h2 className="text-ink mt-1 font-medium">{problem.title}</h2>
                <p className="text-subtle mt-1 text-sm">
                  {[
                    problem.districtName,
                    problem.domain
                      ? isHindi
                        ? DOMAIN_DEFINITIONS[problem.domain as Domain].labelHi
                        : DOMAIN_DEFINITIONS[problem.domain as Domain].labelEn
                      : null,
                    formatDate(problem.createdAt, isHindi ? 'hi-IN' : 'en-IN'),
                    problem.supportCount > 0
                      ? t('supporters', { count: problem.supportCount })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          aria-label={t('pagination')}
          className="mt-6 flex items-center justify-between gap-3 text-sm"
        >
          {filter.page > 1 ? (
            <Link
              href={{ pathname: '/problems', query: pageQuery(filter.page - 1) }}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {t('previous')}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-subtle">
            {t('pageOf', { page: Math.min(filter.page, pageCount), total: pageCount })}
          </span>
          {filter.page < pageCount ? (
            <Link
              href={{ pathname: '/problems', query: pageQuery(filter.page + 1) }}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {t('next')}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
