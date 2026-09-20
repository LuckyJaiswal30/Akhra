import {
  ArrowRight,
  CircleCheckBig,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Route,
  Sparkles,
  Users,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageIntro } from '@/components/marketing';
import { Card, buttonVariants } from '@/components/ui';
import { getPathname, Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'how' });
  return { title: t('title') };
}

const STAGES = [
  { key: 'reported', Icon: FileText },
  { key: 'validated', Icon: ClipboardCheck },
  { key: 'routed', Icon: Route },
  { key: 'collaborate', Icon: Users },
  { key: 'piloted', Icon: FlaskConical },
  { key: 'deployed', Icon: CircleCheckBig },
] as const;

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('how');
  const numberLocale = locale === 'hi' ? 'hi-IN' : 'en-IN';

  return (
    <>
      <PageIntro title={t('title')} intro={t('intro')} />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:px-8">
        <ol className="space-y-4">
          {STAGES.map(({ key, Icon }, index) => (
            <li key={key}>
              <Card className="flex gap-5 p-5 sm:p-6">
                <span className="bg-sal-wash text-sal relative grid h-12 w-12 shrink-0 place-items-center rounded-full">
                  <Icon aria-hidden className="h-6 w-6" />
                  <span className="bg-sal text-on-sal absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold">
                    {formatNumber(index + 1, numberLocale)}
                  </span>
                </span>
                <div>
                  <h2 className="text-ink text-lg font-semibold">{t(`${key}Title`)}</h2>
                  <p className="text-subtle mt-1">{t(`${key}Body`)}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="text-ink text-lg font-semibold">{t('trackTitle')}</h2>
            <p className="text-subtle mt-1 text-sm">{t('trackBody')}</p>
            <form
              action={getPathname({ href: '/track', locale: locale as Locale })}
              method="get"
              className="mt-4 space-y-3"
            >
              <label htmlFor="how-ref" className="text-ink block text-sm font-medium">
                {t('trackLabel')}
              </label>
              <input
                id="how-ref"
                name="ref"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="AKH-2026-000123"
                className="border-field bg-surface text-ink placeholder:text-subtle/80 focus-visible:border-sal focus-visible:ring-sal/20 min-h-12 w-full rounded-md border px-3.5 font-mono text-base uppercase placeholder:normal-case focus-visible:ring-4 focus-visible:outline-none"
              />
              <button
                type="submit"
                className={buttonVariants({
                  size: 'lg',
                  variant: 'secondary',
                  className: 'w-full',
                })}
              >
                {t('trackButton')}
              </button>
            </form>
          </Card>

          <div className="bg-mint rounded-2xl p-6">
            <Sparkles aria-hidden className="text-sal h-6 w-6" />
            <h2 className="text-ink mt-3 font-semibold">{t('aiTitle')}</h2>
            <p className="text-subtle mt-1 text-sm">{t('aiBody')}</p>
          </div>

          <div className="bg-sal text-on-sal rounded-2xl p-6">
            <h2 className="text-lg font-semibold">{t('ctaTitle')}</h2>
            <p className="text-on-sal/90 mt-1 text-sm">{t('ctaBody')}</p>
            <Link
              href="/submit"
              className={buttonVariants({ variant: 'secondary', className: 'mt-4' })}
            >
              {t('ctaButton')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
