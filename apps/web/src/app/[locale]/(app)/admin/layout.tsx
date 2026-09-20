import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { DashboardFrame } from '@/components/dashboard-frame';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [t, analytics] = await Promise.all([
    getTranslations('admin'),
    getTranslations('analytics'),
  ]);

  return (
    <DashboardFrame
      label={t('title')}
      nav={[
        { href: '/admin', label: t('tabAccess') },
        { href: '/government', label: analytics('tabDashboard') },
        { href: '/government/queue', label: analytics('tabQueue') },
        { href: '/government/proposals', label: analytics('tabProposals') },
      ]}
    >
      {children}
    </DashboardFrame>
  );
}
