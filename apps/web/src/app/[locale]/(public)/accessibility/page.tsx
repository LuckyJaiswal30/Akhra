import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DocColumns, DocSection, DocumentBody, MarkList } from '@/components/document';
import { PageIntro } from '@/components/marketing';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'accessibility' });
  return { title: t('title') };
}

const IN_PLACE = ['done1', 'done2', 'done3', 'done4', 'done5', 'done6', 'done7', 'done8'] as const;
const NOT_YET = ['limit1', 'limit2', 'limit3', 'limit4'] as const;

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('accessibility');

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />
      <DocumentBody>
        <DocSection title={t('standardTitle')} lead={t('standardBody')} />
        <DocColumns>
          <DocSection size="md" title={t('doneTitle')}>
            <MarkList mark="yes" items={IN_PLACE.map((key) => t(key))} />
          </DocSection>
          <DocSection size="md" title={t('limitsTitle')} lead={t('limitsBody')}>
            <MarkList mark="no" items={NOT_YET.map((key) => t(key))} />
          </DocSection>
        </DocColumns>
        <DocSection title={t('feedbackTitle')} lead={t('feedbackBody')}>
          <Link href="/submit" className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
            {t('feedbackCta')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <p className="text-subtle mt-8 text-sm">{t('reviewed')}</p>
        </DocSection>
      </DocumentBody>
    </>
  );
}
