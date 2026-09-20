import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DOMAIN_DEFINITIONS, isDomain } from '@akhra/shared';
import { PageIntro, StatsBand } from '@/components/marketing';
import { Card } from '@/components/ui';
import { BarList, DistrictMap, getPlatformStats, getPublicImpact } from '@/modules/analytics';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'impact' });
  return { title: t('title') };
}

const STAGES = [
  'submitted',
  'validated',
  'routed',
  'in_progress',
  'prototyped',
  'piloted',
  'deployed',
] as const;

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-ink font-semibold">{title}</h2>
      {subtitle && <p className="text-subtle mt-1 text-sm">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default async function ImpactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('impact');
  const outcomeLabel = await getTranslations('lifecycle');
  const [stats, impact] = await Promise.all([getPlatformStats(), getPublicImpact()]);
  const isHindi = locale === 'hi';

  const empty = <p className="text-subtle text-sm">{t('noData')}</p>;
  const domainRows = impact.byDomain.map((row) => {
    const definition = isDomain(row.domain) ? DOMAIN_DEFINITIONS[row.domain] : null;
    return {
      key: row.domain,
      label: definition ? (isHindi ? definition.labelHi : definition.labelEn) : row.domain,
      value: row.count,
    };
  });
  const stageRows = STAGES.map((stage) => ({
    key: stage,
    label: t(`stage_${stage}`),
    value: impact.reached[stage] ?? 0,
  }));
  const outcomeRows = impact.outcomesByType.map((row) => ({
    key: row.type,
    label: outcomeLabel(`outcomeType_${row.type}`),
    value: row.count,
  }));

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />
      <StatsBand stats={stats} locale={locale} />

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Panel title={t('funnel')} subtitle={t('funnelNote')}>
          {(stageRows[0]?.value ?? 0) > 0 ? <BarList rows={stageRows} /> : empty}
        </Panel>
        <Panel title={t('mapTitle')} subtitle={t('mapNote')}>
          <DistrictMap
            values={impact.byDistrict.map((d) => ({ code: d.code, value: d.count }))}
            locale={locale}
            labels={{
              fewer: t('mapFewer'),
              more: t('mapMore'),
              none: t('mapNone'),
              reports: t('mapTitle'),
              credit: t('mapCredit'),
            }}
          />
        </Panel>
        <Panel title={t('byCategory')}>
          {domainRows.length > 0 ? <BarList rows={domainRows} /> : empty}
        </Panel>
        <Panel title={t('outcomesTitle')} subtitle={t('peopleNote')}>
          {outcomeRows.length > 0 ? <BarList rows={outcomeRows} /> : empty}
        </Panel>
      </section>
    </>
  );
}
