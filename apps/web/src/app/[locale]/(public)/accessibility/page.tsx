import { ArrowRight, Check, Minus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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

      {/* A conformance statement is a document, not a dashboard: heading on the left, the text it
          introduces beside it, at a width prose is still legible at. Every section keeps the same
          two columns, so nothing sits alone against an empty half-page. */}
      <article className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section>
          <h2 className="text-ink text-2xl font-bold">{t('standardTitle')}</h2>
          <p className="text-subtle mt-3 text-lg leading-relaxed">{t('standardBody')}</p>
        </section>

        <div className="border-line mt-12 grid gap-x-12 gap-y-10 border-t pt-10 md:grid-cols-2">
          <section>
            <h2 className="text-ink text-xl font-bold">{t('doneTitle')}</h2>
            <ul className="divide-line mt-5 divide-y">
              {IN_PLACE.map((key) => (
                <li key={key} className="text-subtle flex gap-3 py-3">
                  <span
                    aria-hidden
                    className="bg-sal-wash text-sal mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-ink text-xl font-bold">{t('limitsTitle')}</h2>
            <p className="text-subtle mt-2">{t('limitsBody')}</p>
            <ul className="divide-line mt-5 divide-y">
              {NOT_YET.map((key) => (
                <li key={key} className="text-subtle flex gap-3 py-3">
                  <span
                    aria-hidden
                    className="bg-well text-subtle mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="border-line mt-12 border-t pt-10">
          <h2 className="text-ink text-2xl font-bold">{t('feedbackTitle')}</h2>
          <p className="text-subtle mt-3 text-lg leading-relaxed">{t('feedbackBody')}</p>
          <Link href="/submit" className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
            {t('feedbackCta')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <p className="text-subtle mt-8 text-sm">{t('reviewed')}</p>
        </section>
      </article>
    </>
  );
}
