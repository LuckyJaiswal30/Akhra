import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';
import { routing } from '@/i18n/routing';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { ForgotPasswordCard, getAuthPolicy } from '@/modules/auth';
import { getActor } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('forgotTitle') };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  if ((await getActor()).userId) redirect(`${prefix}/dashboard` as Route);
  const labels = (await getMessages()).auth as Record<string, string>;
  const { password } = await getAuthPolicy();

  return (
    <AuthShell locale={locale}>
      <ForgotPasswordCard
        labels={labels}
        signInPath={`${prefix}/sign-in`}
        dashboardPath={`${prefix}/dashboard`}
        policy={password}
      />
    </AuthShell>
  );
}
