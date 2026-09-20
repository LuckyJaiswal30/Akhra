import { getTranslations, setRequestLocale } from 'next-intl/server';
import { industryLabels, listDiscoverableProjects, ProjectDiscovery } from '@/modules/industry';
import { requirePageRole } from '@/server/session';

export default async function IndustryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('industry_admin', 'industry_partner');
  const t = await getTranslations('industry');
  const projects = await listDiscoverableProjects(actor);
  const labels = await industryLabels();

  const interestCounts = Object.fromEntries(
    projects.map((p) => [p.id, t('partnersInterested', { count: p.interestCount })]),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-subtle mt-1 text-sm">{t('subtitle')}</p>
      </header>
      <ProjectDiscovery
        projects={projects}
        locale={locale}
        labels={labels}
        interestCounts={interestCounts}
      />
    </div>
  );
}
