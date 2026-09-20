import { ArrowRight, Building2, Handshake, MapPin } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DOMAIN_DEFINITIONS, JHARKHAND_DISTRICTS, isDomain } from '@akhra/shared';
import { PageIntro } from '@/components/marketing';
import { Card, buttonVariants } from '@/components/ui';
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
  const outcomeLabel = await getTranslations('lifecycle');
  const stories = await listSuccessStories();
  const isHindi = locale === 'hi';
  const numberLocale = isHindi ? 'hi-IN' : 'en-IN';

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {stories.length === 0 ? (
          <Card className="text-subtle p-8 text-center">{t('empty')}</Card>
        ) : (
          <ul className="grid gap-6 lg:grid-cols-2">
            {stories.map((story) => {
              const district = JHARKHAND_DISTRICTS.find((d) => d.code === story.districtCode);
              const domain =
                story.domain && isDomain(story.domain) ? DOMAIN_DEFINITIONS[story.domain] : null;
              return (
                <li key={story.id}>
                  <Card className="flex h-full flex-col p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      <span className="bg-sal text-on-sal rounded-full px-3 py-1">
                        {t(`status_${story.status}`)}
                      </span>
                      {domain && (
                        <span className="bg-sal-wash text-sal-deep rounded-full px-3 py-1">
                          {isHindi ? domain.labelHi : domain.labelEn}
                        </span>
                      )}
                      {district && (
                        <span className="bg-well text-ink inline-flex items-center gap-1 rounded-full px-3 py-1">
                          <MapPin aria-hidden className="h-3.5 w-3.5" />
                          {isHindi ? district.nameHi : district.nameEn}
                        </span>
                      )}
                    </div>
                    <h2 className="text-ink mt-4 text-xl font-bold">{story.title}</h2>
                    <p className="text-subtle mt-2">{story.summary}</p>

                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Building2 aria-hidden className="text-sal mt-0.5 h-4 w-4 shrink-0" />
                        <dt className="sr-only">{t('ledBy')}</dt>
                        <dd className="text-ink">
                          {t('ledByValue', { org: story.organizationName })}
                        </dd>
                      </div>
                      {story.partners.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Handshake aria-hidden className="text-sal mt-0.5 h-4 w-4 shrink-0" />
                          <dt className="sr-only">{t('partners')}</dt>
                          <dd className="text-ink">
                            {t('partnersValue', { partners: story.partners.join(', ') })}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {story.outcomes.length > 0 && (
                      <div className="bg-mint mt-5 mb-6 rounded-xl p-4">
                        <h3 className="text-ink text-sm font-semibold">{t('outcomes')}</h3>
                        <ul className="mt-2 space-y-2">
                          {story.outcomes.map((outcome) => (
                            <li key={outcome.id} className="text-sm">
                              <span className="text-sal-deep font-medium">
                                {outcomeLabel(`outcomeType_${outcome.type}`)}:{' '}
                              </span>
                              <span className="text-ink">{outcome.title}</span>
                              {outcome.metricName && outcome.metricValue !== null && (
                                <span className="text-subtle mt-0.5 block">
                                  <span className="text-ink text-lg font-bold tabular-nums">
                                    {formatNumber(outcome.metricValue, numberLocale)}
                                  </span>{' '}
                                  {outcome.metricName}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Link
                      href={{ pathname: '/track', query: { ref: story.refCode } }}
                      className={buttonVariants({
                        variant: 'secondary',
                        // Pushed to the foot of the card, so the buttons in a row line up however
                        // much each story has to say above them.
                        className: 'mt-auto self-start',
                      })}
                    >
                      {t('timeline')}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
