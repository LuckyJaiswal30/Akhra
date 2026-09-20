import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import {
  FacultyExpertiseList,
  getInstitutionProfile,
  InstitutionProfileForm,
} from '@/modules/university';
import { requirePageRole } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'institutionProfile' });
  return { title: t('title') };
}

export default async function InstitutionProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('university_admin', 'faculty');
  const profile = await getInstitutionProfile(actor);
  const labels = (await getMessages()).institutionProfile as Record<string, string>;
  const canEdit = actor.role === 'university_admin';

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <p className="text-subtle mt-1 text-sm">
          {canEdit ? labels.subtitleAdmin : labels.subtitleFaculty}
        </p>
      </header>

      <InstitutionProfileForm profile={profile} canEdit={canEdit} locale={locale} labels={labels} />

      <section aria-labelledby="faculty-heading" className="space-y-3">
        <div>
          <h2 id="faculty-heading" className="text-lg font-medium">
            {labels.facultyTitle}
          </h2>
          <p className="text-subtle mt-0.5 text-sm">{labels.facultyHint}</p>
        </div>
        <FacultyExpertiseList
          faculty={profile.faculty}
          canEdit={canEdit}
          locale={locale}
          labels={labels}
        />
      </section>
    </div>
  );
}
