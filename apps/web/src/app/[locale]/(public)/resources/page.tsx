import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DocSection, DocumentBody, MarkList } from '@/components/document';
import { PageIntro } from '@/components/marketing';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resources' });
  return { title: t('title') };
}

const TIPS = ['tip1', 'tip2', 'tip3', 'tip4'] as const;
const FAQS = ['q1', 'q2', 'q3', 'q8', 'q9', 'q6', 'q7', 'q4', 'q5'] as const;

export default async function ResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('resources');

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />
      <DocumentBody>
        <DocSection title={t('reportTitle')} lead={t('reportBody')}>
          <MarkList mark="yes" items={TIPS.map((key) => t(key))} />
          <Link href="/submit" className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
            {t('reportLink')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </DocSection>
        <DocSection title={t('faqTitle')}>
          <dl className="divide-line mt-5 grid gap-x-12 md:grid-cols-2">
            {FAQS.map((key) => (
              <div key={key} className="border-line border-b py-5">
                <dt className="text-ink font-semibold">{t(`${key}Question`)}</dt>
                <dd className="text-subtle mt-1.5">{t(`${key}Answer`)}</dd>
              </div>
            ))}
          </dl>
        </DocSection>
      </DocumentBody>
    </>
  );
}
