import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('title') };
}

/**
 * The shape the Digital Personal Data Protection Act, 2023 asks a notice to take — what is taken,
 * what for, what is public, how long it is kept, what the person can do about it and whom to ask —
 * written as sentences rather than as clauses.
 */
const SECTIONS = [
  'collect',
  'purpose',
  'password',
  'public',
  'email',
  'keep',
  'rights',
  'contact',
] as const;

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('privacy');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-ink text-3xl font-bold">{t('title')}</h1>
      <p className="text-subtle mt-3">{t('intro')}</p>
      <Card className="divide-line mt-8 divide-y">
        {SECTIONS.map((section) => (
          <section key={section} className="p-6">
            <h2 className="text-ink font-semibold">{t(`${section}Title`)}</h2>
            <p className="text-subtle mt-1">{t(`${section}Body`)}</p>
          </section>
        ))}
      </Card>
    </div>
  );
}
