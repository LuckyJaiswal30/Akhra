import { auth } from '@clerk/nextjs/server';
import type { Route } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { routing } from '@/i18n/routing';
import { AuthCard, UnusableSession, getAuthPolicy, safeReturnPath } from '@/modules/auth';
import { getActor } from '@/server/session';
import { signInEnabled } from '@/server/sign-in-mode';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('signIn') };
}

export async function authPage(
  locale: string,
  tab: 'signin' | 'create',
  redirectUrl: string | undefined,
) {
  setRequestLocale(locale);
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const afterAuth = safeReturnPath(redirectUrl, `${prefix}/dashboard`);

  const actor = await getActor();
  if (actor.userId) redirect(afterAuth as Route);

  const labels = (await getMessages()).auth as Record<string, string>;
  if (signInEnabled && (await auth()).userId) {
    return (
      <AuthShell locale={locale}>
        <UnusableSession labels={labels} signInPath={`${prefix}/sign-in`} />
      </AuthShell>
    );
  }
  const { password, socialStrategies } = await getAuthPolicy();
  const query = redirectUrl ? `?redirect_url=${encodeURIComponent(afterAuth)}` : '';
  return (
    <AuthShell locale={locale}>
      <AuthCard
        labels={labels}
        locale={locale}
        initialTab={tab}
        policy={password}
        social={socialStrategies}
        paths={{
          afterAuth,
          ssoCallback: `${prefix}/sso-callback?redirect_url=${encodeURIComponent(afterAuth)}`,
          signInPath: `${prefix}/sign-in${query}`,
          signUpPath: `${prefix}/sign-up${query}`,
        }}
      />
    </AuthShell>
  );
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect_url?: string; tab?: string }>;
}) {
  const [{ locale }, { redirect_url: redirectUrl, tab }] = await Promise.all([
    params,
    searchParams,
  ]);
  return authPage(locale, tab === 'create' ? 'create' : 'signin', redirectUrl);
}
