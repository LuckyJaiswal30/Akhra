import { auth } from '@clerk/nextjs/server';
import type { Route } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { needsDistrict, profileGaps } from '@akhra/shared';
import { AuthShell } from '@/components/auth-shell';
import { routing } from '@/i18n/routing';
import {
  CompleteProfileCard,
  UnusableSession,
  getOwnProfile,
  safeReturnPath,
} from '@/modules/auth';
import { getActor } from '@/server/session';

const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });
  return { title: t('title') };
}

export default async function CompleteProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const [{ locale }, { redirect_url: redirectUrl }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const messages = await getMessages();
  const labels = {
    ...(messages.auth as Record<string, string>),
    ...(messages.onboarding as Record<string, string>),
  };

  const actor = await getActor();
  if (!actor.userId) {
    if ((await auth()).userId) {
      return (
        <AuthShell locale={locale}>
          <UnusableSession labels={labels} signInPath={`${prefix}/sign-in`} />
        </AuthShell>
      );
    }
    redirect(`${prefix}/sign-in` as Route);
  }

  const target = safeReturnPath(redirectUrl, `${prefix}/dashboard`);
  const profile = await getOwnProfile(actor);
  if (!profile) redirect(`${prefix}/sign-in` as Route);
  if (profileGaps(profile).length === 0) redirect(target as Route);

  return (
    <AuthShell locale={locale} trustNote={false}>
      <CompleteProfileCard
        labels={labels}
        locale={locale}
        email={profile.email}
        initial={{
          name: profile.name ?? '',
          phone: profile.phone ?? '',
          districtCode: profile.districtCode ?? '',
          locality: profile.locality ?? '',
        }}
        needsDistrict={needsDistrict(profile.role)}
        needsConsent={!profile.privacyAcceptedAt}
        isNew={Date.now() - profile.createdAt.getTime() < NEW_ACCOUNT_MS}
        target={target}
        signInPath={`${prefix}/sign-in`}
      />
    </AuthShell>
  );
}
