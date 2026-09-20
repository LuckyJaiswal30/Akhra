import { getTranslations } from 'next-intl/server';
import { authPage } from '../sign-in/page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('createTitle') };
}

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const [{ locale }, { redirect_url: redirectUrl }] = await Promise.all([params, searchParams]);
  return authPage(locale, 'create', redirectUrl);
}
