import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { DashboardFrame } from '@/components/dashboard-frame';

export default async function GovernmentLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('analytics');
  return (
    <DashboardFrame
      label={t('title')}
      nav={[
        { href: '/government', label: t('tabDashboard') },
        { href: '/government/queue', label: t('tabQueue') },
        { href: '/government/proposals', label: t('tabProposals') },
      ]}
    >
      {children}
    </DashboardFrame>
  );
}
