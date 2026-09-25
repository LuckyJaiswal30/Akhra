import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DOMAIN_DEFINITIONS, JHARKHAND_DISTRICTS, isDomain } from '@akhra/shared';
import { PageIntro, StatsBand } from '@/components/marketing';
import { DocColumns, DocSection, DocumentBody } from '@/components/document';
import { BarList, DistrictMap, getPlatformStats, getPublicImpact } from '@/modules/analytics';
import { serverEnv } from '@/server/env';

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

export default async function ImpactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('impact');
  const outcomeLabel = await getTranslations('lifecycle');
  const tLanding = await getTranslations('landing');
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
  const districtRows = JHARKHAND_DISTRICTS.map((district) => ({
    code: district.code,
    name: isHindi ? district.nameHi : district.nameEn,
    count: impact.byDistrict.find((row) => row.code === district.code)?.count ?? 0,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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
      <StatsBand
        stats={stats}
        locale={locale}
        note={serverEnv.ALLOW_SEED ? tLanding('sampleData') : undefined}
      />

      <DocumentBody>
        <DocColumns>
          <DocSection size="md" title={t('funnel')} lead={t('funnelNote')}>
            <div className="mt-5">
              {(stageRows[0]?.value ?? 0) > 0 ? <BarList rows={stageRows} /> : empty}
            </div>
          </DocSection>
          <DocSection size="md" title={t('mapTitle')} lead={t('mapNote')}>
            <div className="mt-5">
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
              <details className="mt-4">
                <summary className="text-sal cursor-pointer text-sm font-medium">
                  {t('mapList')}
                </summary>
                <ul className="divide-line mt-2 grid grid-cols-2 gap-x-6 text-sm">
                  {districtRows.map((row) => (
                    <li key={row.code} className="border-line flex justify-between border-b py-1.5">
                      <span className="text-ink">{row.name}</span>
                      <span className="text-subtle tabular-nums">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </DocSection>
        </DocColumns>
        <DocColumns>
          <DocSection size="md" title={t('byCategory')}>
            <div className="mt-5">
              {domainRows.length > 0 ? <BarList rows={domainRows} /> : empty}
            </div>
          </DocSection>
          <DocSection size="md" title={t('outcomesTitle')} lead={t('peopleNote')}>
            <div className="mt-5">
              {outcomeRows.length > 0 ? <BarList rows={outcomeRows} /> : empty}
            </div>
          </DocSection>
        </DocColumns>
      </DocumentBody>
    </>
  );
}
