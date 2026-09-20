import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';
import { routing } from '@/i18n/routing';
import { SecureAccountCard, type SecureAccountState } from '@/modules/auth';
import { getActor } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'security' });
  return { title: t('title'), robots: { index: false } };
}

export default async function SecureAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const [{ locale }, { done }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const labels = (await getMessages()).security as Record<string, string>;

  const actor = done ? null : await getActor();
  const state: SecureAccountState = done
    ? { kind: 'done' }
    : actor?.userId
      ? { kind: 'confirm' }
      : { kind: 'guide' };

  return (
    <AuthShell locale={locale} trustNote={false}>
      <SecureAccountCard
        state={state}
        labels={labels}
        donePath={`${prefix}/secure-account?done=1`}
      />
    </AuthShell>
  );
}
