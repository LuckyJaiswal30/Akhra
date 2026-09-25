import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { DashboardFrame } from '@/components/dashboard-frame';
import { getActor } from '@/server/session';

export default async function UniversityLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('university');
  const actor = await getActor();

  const nav =
    actor.role === 'student'
      ? [{ href: '/university/projects', label: t('tabProjects') }]
      : [
          { href: '/university', label: t('tabReferrals') },
          { href: '/university/projects', label: t('tabProjects') },
          { href: '/university/partnerships', label: t('tabPartnerships') },
          { href: '/university/team', label: t('tabTeam') },
          { href: '/university/profile', label: t('tabProfile') },
        ];

  return (
    <DashboardFrame label={t('title')} nav={nav}>
      {children}
    </DashboardFrame>
  );
}
