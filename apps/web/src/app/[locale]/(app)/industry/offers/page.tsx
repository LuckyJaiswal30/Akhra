import { getTranslations, setRequestLocale } from 'next-intl/server';
import { IncomingOffers, industryLabels, listOwnInterests } from '@/modules/industry';
import { requirePageRole } from '@/server/session';

export default async function IndustryOffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('industry_admin', 'industry_partner');
  const t = await getTranslations('industry');
  const offers = await listOwnInterests(actor);
  const labels = await industryLabels();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('tabOffers')}</h1>
      </header>
      <IncomingOffers offers={offers} perspective="industry" locale={locale} labels={labels} />
    </div>
  );
}
