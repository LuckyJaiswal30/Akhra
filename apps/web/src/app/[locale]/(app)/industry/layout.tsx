import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { DashboardFrame } from '@/components/dashboard-frame';

export default async function IndustryLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('industry');
  return (
    <DashboardFrame
      label={t('title')}
      nav={[
        { href: '/industry', label: t('tabDiscover') },
        { href: '/industry/offers', label: t('tabOffers') },
        { href: '/industry/team', label: t('tabTeam') },
      ]}
    >
      {children}
    </DashboardFrame>
  );
}
