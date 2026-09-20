import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';
import { routing } from '@/i18n/routing';
import { ForgotPasswordCard, getAuthPolicy } from '@/modules/auth';

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
  const labels = (await getMessages()).auth as Record<string, string>;
  const { password } = await getAuthPolicy();

  return (
    <AuthShell locale={locale}>
      <ForgotPasswordCard labels={labels} signInPath={`${prefix}/sign-in`} policy={password} />
    </AuthShell>
  );
}
