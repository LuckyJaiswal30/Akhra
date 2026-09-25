import type { Metadata } from 'next';
import { Download, TriangleAlert } from 'lucide-react';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import {
  DOMAIN_DEFINITIONS,
  DOMAIN_LIST,
  JHARKHAND_DISTRICTS,
  PARTNER_KIND_LABELS,
  STATUS_DEFINITIONS,
  analyticsRangeSchema,
  type Domain,
  type PartnerKind,
  type ProblemStatus,
} from '@akhra/shared';
import {
  BarList,
  ChartCard,
  DataTable,
  DistrictMap,
  getDashboard,
  SectorDistrictGrid,
  ShareBar,
  StatTile,
  TableToggle,
  TrendChart,
} from '@/modules/analytics';
import { MobileCollapsible } from '@/components/mobile-collapsible';
import { buttonVariants, Field, Select } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { getActor, requirePageRole } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const [{ locale }, actor] = await Promise.all([params, getActor()]);
  const t = await getTranslations({ locale, namespace: 'analytics' });
  const district = actor.jurisdiction
    ? JHARKHAND_DISTRICTS.find((d) => d.code === actor.jurisdiction)
    : undefined;
  return {
    title: district
      ? t('districtTitle', { district: locale === 'hi' ? district.nameHi : district.nameEn })
      : t('title'),
  };
}

const TIER_COLORS: Record<string, string> = {
  gemini: 'var(--series-1)',
  groq: 'var(--series-2)',
  tfidf: 'var(--series-3)',
  manual: 'var(--series-4)',
  unclassified: 'var(--viz-neutral)',
};

export default async function GovernmentDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ locale }, rawSearch] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const actor = await requirePageRole('gov_admin', 'super_admin');
  const t = await getTranslations('analytics');
  const officerDistrict = actor.jurisdiction
    ? JHARKHAND_DISTRICTS.find((d) => d.code === actor.jurisdiction)
    : undefined;
  const tl = await getTranslations('lifecycle');
  const analyticsMessages = (await getMessages()).analytics as Record<string, string>;
  const isHindi = locale === 'hi';
  const intlLocale = isHindi ? 'hi-IN' : 'en-IN';

  const parsed = analyticsRangeSchema.safeParse(rawSearch);
  const filter = parsed.success
    ? { domain: parsed.data.domain, districtCode: parsed.data.districtCode }
    : {};
  const data = await getDashboard(actor, filter);

  const number = (value: number) => value.toLocaleString(intlLocale);
  const compact = (value: number) =>
    new Intl.NumberFormat(intlLocale, { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  const percent = (value: number) =>
    new Intl.NumberFormat(intlLocale, { style: 'percent', maximumFractionDigits: 0 }).format(value);
  const domainLabel = (domain: Domain) =>
    isHindi ? DOMAIN_DEFINITIONS[domain].labelHi : DOMAIN_DEFINITIONS[domain].labelEn;
  const stageLabel = (status: string) => {
    const def = STATUS_DEFINITIONS[status as ProblemStatus];
    return isHindi ? def.labelHi : def.labelEn;
  };
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(
      new Date(`${month}-01T00:00:00`),
    );

  const submittedCount = data.funnel[0]?.reached ?? 0;
  const { kpis } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <h1 className="text-2xl font-bold">
            {officerDistrict
              ? t('districtTitle', {
                  district: isHindi ? officerDistrict.nameHi : officerDistrict.nameEn,
                })
              : t('title')}
          </h1>
          <p className="text-subtle mt-1 text-sm">{t('subtitle')}</p>
          <p className="text-subtle mt-1 text-xs">
            {t('computedAt', {
              time: new Intl.DateTimeFormat(intlLocale, {
                hour: 'numeric',
                minute: '2-digit',
                day: 'numeric',
                month: 'short',
                timeZone: 'Asia/Kolkata',
              }).format(new Date(data.computedAt)),
            })}
          </p>
        </div>
        <a
          href={`/api/v1/analytics/export?${new URLSearchParams(
            Object.entries(filter).filter((entry): entry is [string, string] => Boolean(entry[1])),
          ).toString()}`}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          download
        >
          <Download aria-hidden className="h-4 w-4" />
          {t('exportReports')}
        </a>
      </header>
      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <MobileCollapsible
          label={t('filters')}
          count={[filter.domain, filter.districtCode].filter(Boolean).length}
          inline
        >
          <Field label={t('filterDomain')} htmlFor="filter-domain">
            <Select id="filter-domain" name="domain" defaultValue={filter.domain ?? ''}>
              <option value="">{t('all')}</option>
              {DOMAIN_LIST.map((d) => (
                <option key={d.id} value={d.id}>
                  {isHindi ? d.labelHi : d.labelEn}
                </option>
              ))}
            </Select>
          </Field>
          {!officerDistrict && (
            <Field label={t('filterDistrict')} htmlFor="filter-district">
              <Select
                id="filter-district"
                name="districtCode"
                defaultValue={filter.districtCode ?? ''}
              >
                <option value="">{t('all')}</option>
                {JHARKHAND_DISTRICTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {isHindi ? d.nameHi : d.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </MobileCollapsible>
        <button type="submit" className={buttonVariants({ size: 'lg' })}>
          {t('apply')}
        </button>
        {(filter.domain || filter.districtCode) && (
          <Link
            href="/government"
            className="text-subtle px-2 py-2 text-sm underline-offset-4 hover:underline"
          >
            {t('reset')}
          </Link>
        )}
        <p className="text-subtle w-full text-xs">{t('filterNote')}</p>
      </form>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
        <div className="border-line bg-surface shadow-card rounded-2xl border p-5">
          <p className="text-sm text-(--viz-text-secondary)">{t('totalReports')}</p>
          <p className="text-ink mt-2 text-5xl font-bold">{number(kpis.totalReports)}</p>
          <p className="mt-3 text-sm text-(--viz-text-secondary)">
            {t('districtsReached')}:{' '}
            <span className="text-ink font-medium">
              {kpis.districtsReached} / {JHARKHAND_DISTRICTS.length}
            </span>
          </p>
          {kpis.criticalOpen > 0 && (
            <Link
              href="/government/queue"
              className="bg-danger-wash text-danger mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
            >
              <TriangleAlert aria-hidden className="h-4 w-4 shrink-0" />
              {t('criticalOpen', { count: kpis.criticalOpen })}
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatTile label={t('activeProjects')} value={number(kpis.activeProjects)} />
          <StatTile label={t('deployed')} value={number(kpis.deployed)} />
          <StatTile
            label={t('completionRate')}
            value={percent(kpis.completionRate)}
            hint={t('completionHint')}
          />
          <StatTile
            label={t('medianDaysToRoute')}
            value={kpis.medianDaysToRoute == null ? '—' : number(kpis.medianDaysToRoute)}
          />
        </div>
      </section>

      <section aria-labelledby="innovation-heading" className="space-y-3">
        <h2 id="innovation-heading" className="font-medium">
          {t('innovationTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label={t('patents')} value={number(kpis.patents)} />
          <StatTile label={t('startups')} value={number(kpis.startups)} />
          <StatTile
            label={t('communityReach')}
            value={compact(kpis.communityReach)}
            hint={t('communityReachHint')}
          />
          <StatTile label={t('fundingCommitted')} value={`₹${compact(kpis.fundingCommitted)}`} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('trendTitle')} subtitle={t('trendSubtitle')} className="lg:col-span-2">
          <TrendChart
            data={data.monthly.map((m) => ({
              month: m.month,
              submitted: m.submitted,
              deployed: m.deployed,
            }))}
            series={[
              { key: 'submitted', label: t('submitted'), color: 'var(--series-1)' },
              { key: 'deployed', label: t('deployedSeries'), color: 'var(--series-2)' },
            ]}
            locale={locale}
          />
          <TableToggle label={t('viewTable')}>
            <DataTable
              caption={t('trendTitle')}
              rows={data.monthly}
              rowKey={(r) => r.month}
              columns={[
                { key: 'month', header: t('colMonth'), cell: (r) => monthLabel(r.month) },
                {
                  key: 'submitted',
                  header: t('submitted'),
                  cell: (r) => number(r.submitted),
                  numeric: true,
                },
                {
                  key: 'deployed',
                  header: t('deployedSeries'),
                  cell: (r) => number(r.deployed),
                  numeric: true,
                },
              ]}
            />
          </TableToggle>
        </ChartCard>

        <ChartCard title={t('domainsTitle')} subtitle={t('domainsSubtitle')}>
          {data.domains.length === 0 ? (
            <p className="text-subtle text-sm">{t('none')}</p>
          ) : (
            <BarList
              rows={data.domains.map((d) => ({
                key: d.domain,
                label: domainLabel(d.domain),
                value: d.total,
                detail: `${d.deployed} ${t('colDeployed').toLowerCase()}`,
              }))}
            />
          )}
        </ChartCard>

        <ChartCard title={t('funnelTitle')} subtitle={t('funnelSubtitle')}>
          <BarList
            rows={data.funnel.map((stage) => ({
              key: stage.status,
              label: stageLabel(stage.status),
              value: stage.reached,
              detail:
                submittedCount > 0
                  ? `${percent(stage.reached / submittedCount)} ${t('ofSubmitted')}`
                  : undefined,
            }))}
          />
        </ChartCard>

        <ChartCard
          title={t('sectorGridTitle')}
          subtitle={t('sectorGridSubtitle')}
          className="lg:col-span-2"
        >
          {data.sectorDistricts.length === 0 ? (
            <p className="text-subtle text-sm">{t('none')}</p>
          ) : (
            <SectorDistrictGrid
              cells={data.sectorDistricts}
              locale={locale}
              labels={{
                district: t('colDistrict'),
                total: t('colTotal'),
                fewer: t('fewer'),
                more: t('more'),
                cellTitle: analyticsMessages.sectorCell!,
              }}
            />
          )}
        </ChartCard>

        <ChartCard title={t('mapTitle')} subtitle={t('mapSubtitle')} className="lg:col-span-2">
          <DistrictMap
            values={data.districts.map((d) => ({
              code: d.code,
              value: d.total,
              detail: `${d.active} ${t('active')}, ${d.deployed} ${t('colDeployed').toLowerCase()}`,
            }))}
            locale={locale}
            labels={{
              fewer: t('fewer'),
              more: t('more'),
              none: t('noReportsYet'),
              reports: t('mapTitle'),
              credit: t('mapCredit'),
            }}
          />
          <TableToggle label={t('viewTable')}>
            <DataTable
              caption={t('mapTitle')}
              rows={[...data.districts].sort((a, b) => b.total - a.total)}
              rowKey={(r) => r.code}
              columns={[
                {
                  key: 'district',
                  header: t('colDistrict'),
                  cell: (r) => (isHindi ? r.nameHi : r.nameEn),
                },
                {
                  key: 'total',
                  header: t('colTotal'),
                  cell: (r) => number(r.total),
                  numeric: true,
                },
                {
                  key: 'active',
                  header: t('colActive'),
                  cell: (r) => number(r.active),
                  numeric: true,
                },
                {
                  key: 'deployed',
                  header: t('colDeployed'),
                  cell: (r) => number(r.deployed),
                  numeric: true,
                },
              ]}
            />
          </TableToggle>
        </ChartCard>
      </div>

      <MobileCollapsible label={t('moreFigures')}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ChartCard
            title={t('tiersTitle')}
            subtitle={t('tiersSubtitle')}
            className="lg:col-span-2"
          >
            <ShareBar
              locale={locale}
              segments={['gemini', 'groq', 'tfidf', 'manual', 'unclassified']
                .map((tier) => ({
                  key: tier,
                  label: t(`tier_${tier}`),
                  value: data.classifierTiers.find((c) => c.key === tier)?.total ?? 0,
                  color: TIER_COLORS[tier] ?? 'var(--viz-neutral)',
                }))
                .filter((s) => s.value > 0 || s.key !== 'unclassified')}
            />
          </ChartCard>

          <ChartCard title={t('institutionsTitle')} className="lg:col-span-2">
            <DataTable
              caption={t('institutionsTitle')}
              rows={data.institutions}
              rowKey={(r) => r.name}
              columns={[
                { key: 'name', header: t('colInstitution'), cell: (r) => r.name },
                {
                  key: 'referrals',
                  header: t('colReferrals'),
                  cell: (r) => number(r.referrals),
                  numeric: true,
                },
                {
                  key: 'accepted',
                  header: t('colAccepted'),
                  cell: (r) => number(r.accepted),
                  numeric: true,
                },
                {
                  key: 'projects',
                  header: t('colProjects'),
                  cell: (r) => number(r.projects),
                  numeric: true,
                },
                {
                  key: 'outcomes',
                  header: t('colOutcomes'),
                  cell: (r) => number(r.outcomes),
                  numeric: true,
                },
              ]}
            />
          </ChartCard>

          <ChartCard title={t('partnersTitle')}>
            <DataTable
              caption={t('partnersTitle')}
              rows={data.partners}
              rowKey={(r) => r.name}
              columns={[
                { key: 'name', header: t('colPartner'), cell: (r) => r.name },
                {
                  key: 'kind',
                  header: t('colPartnerKind'),
                  cell: (r) =>
                    r.kind
                      ? isHindi
                        ? PARTNER_KIND_LABELS[r.kind].hi
                        : PARTNER_KIND_LABELS[r.kind].en
                      : '—',
                },
                {
                  key: 'offers',
                  header: t('colOffers'),
                  cell: (r) => number(r.offers),
                  numeric: true,
                },
                {
                  key: 'accepted',
                  header: t('colAccepted'),
                  cell: (r) => number(r.accepted),
                  numeric: true,
                },
                {
                  key: 'funding',
                  header: t('colFunding'),
                  cell: (r) => (r.funding > 0 ? `₹${compact(r.funding)}` : '—'),
                  numeric: true,
                },
              ]}
            />
          </ChartCard>

          <ChartCard title={t('partnerKindsTitle')} subtitle={t('partnerKindsSubtitle')}>
            {data.partnerKinds.length === 0 ? (
              <p className="text-subtle text-sm">{t('none')}</p>
            ) : (
              <BarList
                rows={data.partnerKinds.map((row) => ({
                  key: row.key,
                  label: isHindi
                    ? PARTNER_KIND_LABELS[row.key as PartnerKind].hi
                    : PARTNER_KIND_LABELS[row.key as PartnerKind].en,
                  value: row.total,
                }))}
              />
            )}
          </ChartCard>

          <ChartCard title={t('outcomesTitle')}>
            {data.outcomesByType.length === 0 ? (
              <p className="text-subtle text-sm">{t('none')}</p>
            ) : (
              <DataTable
                caption={t('outcomesTitle')}
                rows={data.outcomesByType}
                rowKey={(r) => r.key}
                columns={[
                  { key: 'type', header: t('colType'), cell: (r) => tl(`outcomeType_${r.key}`) },
                  {
                    key: 'count',
                    header: t('colCount'),
                    cell: (r) => number(r.total),
                    numeric: true,
                  },
                ]}
              />
            )}
          </ChartCard>
        </div>
      </MobileCollapsible>
    </div>
  );
}
