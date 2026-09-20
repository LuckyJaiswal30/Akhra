import { getTranslations, setRequestLocale } from 'next-intl/server';
import { IncomingOffers, industryLabels, listIncomingInterests } from '@/modules/industry';
import { requirePageRole } from '@/server/session';

export default async function UniversityPartnershipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('university_admin', 'faculty');
  const t = await getTranslations('industry');
  const offers = await listIncomingInterests(actor);
  const labels = await industryLabels();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('offersTitle')}</h1>
        <p className="text-subtle mt-1 text-sm">{t('offersSubtitle')}</p>
      </header>
      <IncomingOffers offers={offers} perspective="university" locale={locale} labels={labels} />
    </div>
  );
}
