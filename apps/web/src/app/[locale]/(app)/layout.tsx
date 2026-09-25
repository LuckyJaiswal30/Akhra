import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getProfileGaps } from '@/modules/auth';
import { getActor } from '@/server/session';

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, actor] = await Promise.all([params, getActor()]);
  if (!actor.userId || actor.role === 'anonymous') {
    redirect('/sign-in');
  }
  if ((await getProfileGaps(actor)).length > 0) {
    redirect('/complete-profile');
  }

  return (
    <>
      <SiteHeader locale={locale} />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      <SiteFooter />
    </>
  );
}
