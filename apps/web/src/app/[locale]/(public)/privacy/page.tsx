import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DocColumns, DocSection, DocumentBody, MarkList } from '@/components/document';
import { PageIntro } from '@/components/marketing';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('title') };
}

// The parts a notice under the Digital Personal Data Protection Act, 2023 must cover: what is
// taken and why, what is shown, how long it is kept, what the person can do, and whom to ask.
const SHOWN = ['shown1', 'shown2', 'shown3'] as const;
const NEVER_SHOWN = ['hidden1', 'hidden2', 'hidden3'] as const;

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('privacy');

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />
      <DocumentBody>
        <DocColumns>
          <DocSection size="md" title={t('collectTitle')} lead={t('collectBody')} />
          <DocSection size="md" title={t('purposeTitle')} lead={t('purposeBody')} />
        </DocColumns>
        <DocColumns>
          <DocSection size="md" title={t('shownTitle')}>
            <MarkList mark="yes" items={SHOWN.map((key) => t(key))} />
          </DocSection>
          <DocSection size="md" title={t('hiddenTitle')}>
            <MarkList mark="no" items={NEVER_SHOWN.map((key) => t(key))} />
          </DocSection>
        </DocColumns>
        <DocSection title={t('keepTitle')} lead={t('keepBody')} />
        <DocColumns>
          <DocSection size="md" title={t('passwordTitle')} lead={t('passwordBody')} />
          <DocSection size="md" title={t('emailTitle')} lead={t('emailBody')} />
        </DocColumns>
        <DocSection title={t('rightsTitle')} lead={t('rightsBody')} />
        <DocSection title={t('contactTitle')} lead={t('contactBody')}>
          <Link href="/submit" className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
            {t('contactCta')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </DocSection>
      </DocumentBody>
    </>
  );
}
