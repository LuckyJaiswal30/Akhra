import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export async function SignInUnavailable() {
  const t = await getTranslations('auth');
  return (
    <section aria-labelledby="sign-in-unavailable" className="max-w-md">
      <h1 id="sign-in-unavailable" className="text-ink text-2xl font-bold">
        {t('unavailableTitle')}
      </h1>
      <p className="text-subtle mt-3">{t('unavailableBody')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/submit" className={buttonVariants({})}>
          {t('unavailableReport')}
        </Link>
        <Link href="/track" className={buttonVariants({ variant: 'secondary' })}>
          {t('unavailableTrack')}
        </Link>
      </div>
    </section>
  );
}
