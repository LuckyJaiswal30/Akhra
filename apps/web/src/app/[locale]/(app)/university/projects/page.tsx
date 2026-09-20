import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  INSTITUTION_ROLES,
  PROJECT_PLANNING_STATUS,
  STATUS_DEFINITIONS,
  type ProblemStatus,
} from '@akhra/shared';
import { listOrganizationProjects } from '@/modules/university';
import { Link } from '@/i18n/navigation';
import { requirePageRole } from '@/server/session';

export default async function UniversityProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole(...INSTITUTION_ROLES);
  const t = await getTranslations('university');
  const projects = await listOrganizationProjects(actor);
  const isHindi = locale === 'hi';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {actor.role === 'student' ? t('myProjectsTitle') : t('projectsTitle')}
        </h1>
      </header>
      {projects.length === 0 ? (
        <p className="border-line text-subtle border-y px-6 py-10 text-center text-sm">
          {actor.role === 'student' ? t('myProjectsEmpty') : t('projectsEmpty')}
        </p>
      ) : (
        <ul className="divide-line border-line divide-y border-y">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="hover:bg-well/40 block py-4 transition-colors sm:-mx-3 sm:px-3"
              >
                <div className="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="font-mono">{project.refCode}</span>
                  <span>{t('members', { count: project.memberCount })}</span>
                </div>
                <h2 className="mt-1.5 font-medium">{project.title}</h2>
                <span className="border-line mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-xs">
                  {project.status === PROJECT_PLANNING_STATUS
                    ? t('stagePlanning')
                    : isHindi
                      ? STATUS_DEFINITIONS[project.status as ProblemStatus].labelHi
                      : STATUS_DEFINITIONS[project.status as ProblemStatus].labelEn}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
