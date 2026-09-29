import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { appUrl } from '@/server/env';
import { siteImage } from '@/server/og';
import { signInEnabled } from '@/server/sign-in-mode';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexDeva = IBM_Plex_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-deva',
  display: 'swap',
  // Hindi pages still load it as soon as their text needs it; English pages no longer wait on it.
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: '500',
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
});
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brand' });
  return {
    metadataBase: new URL(appUrl),
    title: { default: t('name'), template: `%s | ${t('name')}` },
    description: t('tagline'),
    openGraph: {
      siteName: t('name'),
      locale: locale === 'hi' ? 'hi_IN' : 'en_IN',
      type: 'website',
      images: [{ url: siteImage(locale), width: 1200, height: 630, alt: t('shareAlt') }],
    },
    twitter: { card: 'summary_large_image', images: [siteImage(locale)] },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('common');
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;

  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexDeva.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <OptionalClerkProvider
          signInUrl={`${prefix}/sign-in`}
          signUpUrl={`${prefix}/sign-up`}
          afterSignOutUrl={`${prefix}/`}
          appearance={{
            variables: {
              colorPrimary: '#1F6B45',
              borderRadius: '0.75rem',
              fontFamily: 'var(--font-plex-sans), var(--font-plex-deva), system-ui, sans-serif',
            },
          }}
        >
          <NextIntlClientProvider>
            <a href="#main" className="skip-link">
              {t('skipToContent')}
            </a>
            <main id="main" className="flex flex-1 flex-col">
              {children}
            </main>
          </NextIntlClientProvider>
        </OptionalClerkProvider>
      </body>
    </html>
  );
}

function OptionalClerkProvider(props: ComponentProps<typeof ClerkProvider>) {
  return signInEnabled ? <ClerkProvider {...props} /> : props.children;
}
