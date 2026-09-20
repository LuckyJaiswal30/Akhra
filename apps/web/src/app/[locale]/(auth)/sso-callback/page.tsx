import { getMessages, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';
import { routing } from '@/i18n/routing';
import { SsoCallback, safeReturnPath } from '@/modules/auth';

export default async function SsoCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const [{ locale }, { redirect_url: redirectUrl }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const labels = (await getMessages()).auth as Record<string, string>;

  return (
    <AuthShell locale={locale} trustNote={false}>
      <SsoCallback labels={labels} target={safeReturnPath(redirectUrl, `${prefix}/dashboard`)} />
    </AuthShell>
  );
}
