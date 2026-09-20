'use client';

import { useTranslations } from 'next-intl';
import { AkhraLogo } from '@/components/brand/akhra-logo';
import { Button, Card, buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="bg-surface flex flex-1 flex-col">
      <header className="px-4 py-4 sm:px-8 sm:py-5">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md">
          <AkhraLogo name={t('brand.name')} tagline={t('brand.slogan')} />
        </Link>
      </header>
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:py-16">
        <Card className="p-8 text-center">
          <h1 className="text-ink text-2xl font-bold">{t('errors.pageTitle')}</h1>
          <p className="text-subtle mt-3">{t('errors.pageBody')}</p>
          {error.digest && (
            <p className="text-subtle mt-3 text-sm">
              {t('errors.reference')}{' '}
              <code className="bg-well text-ink rounded-md px-1.5 py-0.5">{error.digest}</code>
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" size="lg" onClick={reset}>
              {t('errors.retry')}
            </Button>
            <Link href="/" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
              {t('errors.home')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
