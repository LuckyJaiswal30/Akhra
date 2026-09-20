import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getInstitutionProfile,
  listOrganizationMembers,
  listRoutedProblems,
  ReferralInbox,
} from '@/modules/university';
import { Alert } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { requirePageRole } from '@/server/session';

export default async function UniversityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('university_admin', 'faculty');
  const t = await getTranslations('university');

  const [referrals, members, profile] = await Promise.all([
    listRoutedProblems(actor),
    listOrganizationMembers(actor),
    getInstitutionProfile(actor),
  ]);

  const labels: Record<string, string> = {
    empty: t('empty'),
    match: t('match'),
    brief: t('brief'),
    accept: t('accept'),
    decline: t('decline'),
    requestReassign: t('requestReassign'),
    accepted: t('accepted'),
    responsePlaceholder: t('responsePlaceholder'),
    response_declined: t('response_declined'),
    response_reassign_requested: t('response_reassign_requested'),
    startProject: t('startProject'),
    openProject: t('openProject'),
    projectTitle: t('projectTitle'),
    projectTitlePlaceholder: t('projectTitlePlaceholder'),
    projectSummary: t('projectSummary'),
    summaryPlaceholder: t('summaryPlaceholder'),
    facultyMentor: t('facultyMentor'),
    assignLater: t('assignLater'),
    createProject: t('createProject'),
    cancel: t('cancel'),
    saving: t('saving'),
    showMore: t('showMore'),
    showLess: t('showLess'),
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-subtle mt-1 text-sm">{t('subtitle')}</p>
      </header>
      {!profile.isRoutable && (
        <Alert tone="warning" title={t('profileMissingTitle')}>
          {t('profileMissingBody')}{' '}
          <Link
            href="/university/profile"
            className="text-sal font-semibold underline underline-offset-4"
          >
            {t('profileMissingLink')}
          </Link>
        </Alert>
      )}
      <ReferralInbox referrals={referrals} members={members} locale={locale} labels={labels} />
    </div>
  );
}
