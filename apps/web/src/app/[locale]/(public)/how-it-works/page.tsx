import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DocColumns, DocSection, DocumentBody, NumberedList } from '@/components/document';
import { PageIntro } from '@/components/marketing';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'how' });
  return { title: t('title') };
}

const FIRST = ['reported', 'validated'] as const;
const DEPARTMENT = ['assigned', 'actionTaken', 'confirmed'] as const;
const RESEARCH = ['routed', 'collaborate', 'piloted', 'deployed'] as const;

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('how');
  const steps = (keys: readonly string[]) =>
    keys.map((key) => ({ title: t(`${key}Title`), body: t(`${key}Body`) }));

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />
      <DocumentBody>
        <DocSection title={t('firstTitle')} lead={t('firstBody')}>
          <NumberedList items={steps(FIRST)} />
        </DocSection>
        <DocColumns>
          <DocSection size="md" title={t('departmentTitle')} lead={t('departmentBody')}>
            <NumberedList items={steps(DEPARTMENT)} />
          </DocSection>
          <DocSection size="md" title={t('researchTitle')} lead={t('researchBody')}>
            <NumberedList items={steps(RESEARCH)} />
          </DocSection>
        </DocColumns>
        <DocSection title={t('aiTitle')} lead={t('aiBody')} />
        <DocSection title={t('ctaTitle')} lead={t('ctaBody')}>
          <Link href="/submit" className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
            {t('ctaButton')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </DocSection>
      </DocumentBody>
    </>
  );
}
