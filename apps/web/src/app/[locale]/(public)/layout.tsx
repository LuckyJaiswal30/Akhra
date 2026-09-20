import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      <SiteHeader locale={locale} />
      <div className="flex-1">{children}</div>
      {/* A public service has to say how it handles your information and how accessible it is, on
          every page, not only once you have an account. */}
      <SiteFooter />
    </>
  );
}
