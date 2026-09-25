import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function SiteFooter() {
  const t = await getTranslations('footer');

  return (
    <footer className="border-line bg-surface border-t">
      <div className="text-subtle mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        <nav aria-label={t('legal')} className="flex flex-wrap items-center gap-x-6">
          <Link href="/privacy" className="hover:text-sal inline-flex min-h-11 items-center">
            {t('privacy')}
          </Link>
          <Link href="/accessibility" className="hover:text-sal inline-flex min-h-11 items-center">
            {t('accessibility')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
