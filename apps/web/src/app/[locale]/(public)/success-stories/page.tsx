import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DOMAIN_DEFINITIONS, JHARKHAND_DISTRICTS, isDomain } from '@akhra/shared';
import { PageIntro } from '@/components/marketing';
import { serverEnv } from '@/server/env';
import { Link } from '@/i18n/navigation';
import { formatNumber } from '@/lib/utils';
import { listSuccessStories } from '@/modules/analytics';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'stories' });
  return { title: t('title') };
}

export default async function SuccessStoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('stories');
  const tLanding = await getTranslations('landing');
  const outcomeLabel = await getTranslations('lifecycle');
  const stories = await listSuccessStories();
  const isHindi = locale === 'hi';
  const numberLocale = isHindi ? 'hi-IN' : 'en-IN';

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')}>
        {serverEnv.ALLOW_SEED && (
          <p className="text-warning mt-4 text-sm font-medium">{tLanding('sampleData')}</p>
        )}
      </PageIntro>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {stories.length === 0 ? (
          <p className="border-line text-subtle border-y py-10 text-center">{t('empty')}</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {stories.map((story) => {
              const district = JHARKHAND_DISTRICTS.find((d) => d.code === story.districtCode);
              const domain =
                story.domain && isDomain(story.domain) ? DOMAIN_DEFINITIONS[story.domain] : null;
              const meta = [
                t(`status_${story.status}`),
                domain ? (isHindi ? domain.labelHi : domain.labelEn) : null,
                district ? (isHindi ? district.nameHi : district.nameEn) : null,
              ].filter(Boolean);
              return (
                <li
                  key={story.id}
                  className="grid gap-x-12 gap-y-4 py-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
                >
                  <div>
                    <p className="text-subtle text-sm">{meta.join(' · ')}</p>
                    <h2 className="text-ink mt-1 text-xl font-bold">{story.title}</h2>
                    <p className="text-subtle mt-2">{story.summary}</p>
                    <p className="text-ink mt-3 text-sm">
                      {t('ledByValue', { org: story.organizationName })}
                      {story.partners.length > 0 &&
                        ` · ${t('partnersValue', { partners: story.partners.join(', ') })}`}
                    </p>
                    <Link
                      href={{ pathname: '/track', query: { ref: story.refCode } }}
                      className="text-sal mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline"
                    >
                      {t('timeline')}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  </div>
                  {story.outcomes.length > 0 && (
                    <div>
                      <h3 className="text-ink text-sm font-semibold">{t('outcomes')}</h3>
                      <ul className="divide-line mt-2 divide-y">
                        {story.outcomes.map((outcome) => (
                          <li key={outcome.id} className="py-2 text-sm">
                            {outcome.metricName && outcome.metricValue !== null && (
                              <span className="text-ink mr-1.5 text-lg font-bold tabular-nums">
                                {formatNumber(outcome.metricValue, numberLocale)}
                              </span>
                            )}
                            {outcome.metricName && outcome.metricValue !== null && (
                              <span className="text-subtle">{outcome.metricName}</span>
                            )}
                            <span className="text-ink block">
                              <span className="text-sal-deep font-medium">
                                {outcomeLabel(`outcomeType_${outcome.type}`)}:
                              </span>{' '}
                              {outcome.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
