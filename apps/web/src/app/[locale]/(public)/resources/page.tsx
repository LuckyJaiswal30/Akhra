import { ArrowRight, Building2, FilePen, Search, ShieldCheck, Waypoints } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageIntro } from '@/components/marketing';
import { Card } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resources' });
  return { title: t('title') };
}

const GUIDES = [
  { key: 'report', Icon: FilePen, href: '/submit' },
  { key: 'track', Icon: Waypoints, href: '/track' },
  { key: 'browse', Icon: Search, href: '/problems' },
  { key: 'join', Icon: Building2, href: '/how-it-works' },
  { key: 'privacy', Icon: ShieldCheck, href: '/privacy' },
] as const;

const FAQS = ['q1', 'q2', 'q3', 'q6', 'q7', 'q4', 'q5'] as const;

export default async function ResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('resources');

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map(({ key, Icon, href }) => (
            <li key={key}>
              <Card className="flex h-full flex-col p-6">
                <span className="bg-sal-wash text-sal grid h-12 w-12 place-items-center rounded-full">
                  <Icon aria-hidden className="h-6 w-6" />
                </span>
                <h2 className="text-ink mt-4 text-lg font-semibold">{t(`${key}Title`)}</h2>
                <p className="text-subtle mt-2 flex-1">{t(`${key}Body`)}</p>
                <Link
                  href={href}
                  className="text-sal mt-4 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold underline-offset-4 hover:underline"
                >
                  {t(`${key}Link`)}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* Every answer is on the page. An accordion hides what someone came to read, and makes them
          guess which of seven closed rows holds it. */}
      <section aria-labelledby="faq-heading" className="border-line bg-surface border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 id="faq-heading" className="text-ink text-2xl font-bold">
            {t('faqTitle')}
          </h2>
          <dl className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-2">
            {FAQS.map((key) => (
              <div key={key} className="border-sal border-l-2 pl-5">
                <dt className="text-ink text-lg font-semibold">{t(`${key}Question`)}</dt>
                <dd className="text-subtle mt-2">{t(`${key}Answer`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
