import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AFFECTED_SCALES, SUBMITTER_TYPES } from '@akhra/shared';
import { SubmitForm, getReporterProfile } from '@/modules/citizen';
import { serverEnv } from '@/server/env';
import { getActor } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'submit' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('submit');
  const profile = await getReporterProfile(await getActor());

  const labels: Record<string, string> = {
    stepsLabel: t('stepsLabel'),
    offline: t('offline'),
    draftSaved: t('draftSaved'),
    draftDiscard: t('draftDiscard'),
    voiceStart: t('voiceStart'),
    voiceStop: t('voiceStop'),
    voiceHint: t('voiceHint'),
    voiceLanguage: t('voiceLanguage'),
    contactNotice: t('contactNotice'),
    privacyLink: t('privacyLink'),
    step_problem: t('step_problem'),
    step_location: t('step_location'),
    step_contact: t('step_contact'),
    title: t('problemTitle'),
    titleHint: t('titleHint'),
    description: t('description'),
    descriptionHint: t('descriptionHint'),
    domain: t('domain'),
    domainHint: t('domainHint'),
    domainAuto: t('domainAuto'),
    district: t('district'),
    districtPlaceholder: t('districtPlaceholder'),
    block: t('block'),
    blockHint: t('blockHint'),
    mapLabel: t('mapLabel'),
    mapHint: t('mapHint'),
    attachments: t('attachments'),
    attachmentsHint: t('attachmentsHint'),
    submitterType: t('submitterType'),
    name: t('name'),
    phone: t('phone'),
    phoneHint: t('phoneHint'),
    email: t('email'),
    emailHint: t('emailHint'),
    organization: t('organization'),
    consent: t('consent'),
    back: t('back'),
    next: t('next'),
    submit: t('submitButton'),
    submitting: t('submitting'),
    successTitle: t('successTitle'),
    successBody: t('successBody'),
    yourRefCode: t('yourRefCode'),
    routedAs: t('routedAs'),
    similarFound: t('similarFound'),
    trackIt: t('trackIt'),
    submitAnother: t('submitAnother'),
    reportingAs: t('reportingAs'),
    editDetails: t('editDetails'),
    profileNote: t('profileNote'),
    affectedScale: t('affectedScale'),
    affectedScaleHint: t('affectedScaleHint'),
    affectedScaleUnsure: t('affectedScaleUnsure'),
    safetyRisk: t('safetyRisk'),
    safetyRiskHint: t('safetyRiskHint'),
  };

  const steps = ['problem', 'location', 'contact'] as const;
  steps.forEach((name, index) => {
    labels[`stepOf_${name}`] = t('stepOf', {
      current: index + 1,
      total: steps.length,
      step: t(`step_${name}`),
    });
  });

  for (const type of SUBMITTER_TYPES) {
    labels[`submitterType_${type}`] = t(`submitterType_${type}`);
  }
  for (const scale of AFFECTED_SCALES) {
    labels[`affectedScale_${scale}`] = t(`affectedScale_${scale}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-subtle mt-2">{profile ? t('subtitleSignedIn') : t('subtitle')}</p>
      <div className="mt-8">
        <SubmitForm
          labels={labels}
          locale={locale}
          maxUploadBytes={serverEnv.MAX_UPLOAD_BYTES}
          profile={profile}
          pickerLabels={{
            choose: t('attachChoose'),
            uploading: t.raw('attachUploading') as string,
            remove: t.raw('attachRemove') as string,
            failed: t('attachFailed'),
            tooLarge: t.raw('attachTooLarge') as string,
            wrongType: t.raw('attachWrongType') as string,
            limitReached: t('attachLimit'),
          }}
        />
      </div>
    </div>
  );
}
