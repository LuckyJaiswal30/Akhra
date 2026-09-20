import { ArrowRight, FileText, MapPin, Rocket, Search, Settings, Users } from 'lucide-react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PartnerStrip, StatsBand } from '@/components/marketing';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { formatNumber } from '@/lib/utils';
import { getPlatformStats } from '@/modules/analytics';
import { getActor } from '@/server/session';

const STEPS = [
  { key: 'report', Icon: FileText },
  { key: 'collaborate', Icon: Users },
  { key: 'develop', Icon: Settings },
  { key: 'deploy', Icon: Rocket },
] as const;

function HeroScene({ place, region, caption }: { place: string; region: string; caption: string }) {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/images/home-hero.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 56vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-[#0f2e1e]/75 to-transparent" />
      <div className="absolute right-6 bottom-16 flex items-center gap-3 rounded-xl border border-white/25 bg-black/45 px-4 py-3 text-white backdrop-blur-sm">
        <MapPin aria-hidden className="h-5 w-5 shrink-0" />
        <span className="text-sm leading-snug">
          <span className="block font-semibold">{place}</span>
          <span className="block text-white/85">{region}</span>
        </span>
      </div>
      <p className="absolute right-6 bottom-6 text-sm text-white/90">{caption}</p>
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const [stats, actor] = await Promise.all([getPlatformStats(), getActor()]);
  const numberLocale = locale === 'hi' ? 'hi-IN' : 'en-IN';
  const scene = { place: t('placeName'), region: t('placeRegion'), caption: t('heroCaption') };

  return (
    <>
      <section className="bg-paper relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 hidden w-[56%] [mask-image:linear-gradient(to_right,transparent,#000_28%)] md:block"
        >
          <HeroScene {...scene} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-10 sm:px-6 lg:px-8 lg:pt-14 lg:pb-16">
          <div className="max-w-xl lg:max-w-[34rem] xl:max-w-xl">
            <p className="text-subtle hidden flex-wrap gap-x-2 text-xs font-medium tracking-[0.22em] uppercase sm:flex">
              {(['eyebrow1', 'eyebrow2', 'eyebrow3', 'eyebrow4'] as const).map((key, index) => (
                <span key={key} className="flex gap-2">
                  {index > 0 && <span aria-hidden>·</span>}
                  {t(key)}
                </span>
              ))}
            </p>
            <h1 className="text-ink text-5xl leading-[1.05] font-bold tracking-tight sm:mt-5 sm:text-6xl">
              {t('titleLine1')}
              <br />
              <span className="text-sal">{t('titleLine2')}</span>
            </h1>
            <p className="text-subtle mt-5 text-lg">{t('intro')}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href={actor.userId ? '/dashboard' : '/sign-in'}
                className={buttonVariants({ size: 'lg', className: 'sm:min-w-56' })}
              >
                {t('getStarted')}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link
                href="/problems"
                className={buttonVariants({
                  size: 'lg',
                  variant: 'secondary',
                  className: 'sm:min-w-56',
                })}
              >
                {t('explore')}
                <Search aria-hidden className="text-sal h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <StatsBand stats={stats} locale={locale} />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:px-8 lg:py-14">
        <div>
          <h2 className="text-ink text-2xl font-bold sm:text-[1.7rem]">{t('processTitle')}</h2>
          <p className="text-subtle mt-2">{t('processSubtitle')}</p>
          <ol className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {STEPS.map(({ key, Icon }, index) => (
              <li key={key} className="relative text-center">
                <span className="bg-sal-wash text-sal mx-auto grid h-16 w-16 place-items-center rounded-full">
                  <Icon aria-hidden className="h-7 w-7" />
                </span>
                {index < STEPS.length - 1 && (
                  <ArrowRight
                    aria-hidden
                    className="text-subtle absolute top-6 -right-5 hidden h-4 w-4 sm:block"
                  />
                )}
                <h3 className="text-ink mt-4 font-semibold">
                  {formatNumber(index + 1, numberLocale)}. {t(`${key}Title`)}
                </h3>
                <p className="text-subtle mt-1.5 text-sm">{t(`${key}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* One thing to read, one thing to do. The figures and the map have their own page. */}
        <div className="bg-mint flex flex-col justify-center rounded-2xl p-8 sm:p-10">
          <h2 className="text-ink text-xl font-bold">{t('innovationTitle')}</h2>
          <p className="text-subtle mt-3">{t('innovationBody')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/how-it-works" className={buttonVariants({})}>
              {t('learnMore')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link href="/impact" className={buttonVariants({ variant: 'secondary' })}>
              {t('seeImpact')}
            </Link>
          </div>
        </div>
      </section>

      <PartnerStrip />
    </>
  );
}
