import { getTranslations } from 'next-intl/server';
import { AkhraLogo } from '@/components/brand/akhra-logo';
import { Card, buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="bg-surface flex flex-1 flex-col">
      <header className="px-4 py-4 sm:px-8 sm:py-5">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md">
          <AkhraLogo name={t('brand.name')} tagline={t('brand.slogan')} />
        </Link>
      </header>
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:py-16">
        <Card className="p-8 text-center">
          <h1 className="text-ink text-2xl font-bold">{t('errors.notFoundTitle')}</h1>
          <p className="text-subtle mt-3">{t('errors.notFoundBody')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className={buttonVariants({ size: 'lg' })}>
              {t('errors.home')}
            </Link>
            <Link href="/track" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
              {t('errors.track')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
