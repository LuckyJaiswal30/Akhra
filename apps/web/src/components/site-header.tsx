import { getTranslations } from 'next-intl/server';
import { AkhraLogo } from '@/components/brand/akhra-logo';
import { Link } from '@/i18n/navigation';
import { getActor } from '@/server/session';
import { LocaleSwitcher } from './locale-switcher';
import { MobileMenu } from './mobile-menu';
import { NavLinks, type NavItem } from './nav-links';
import { UserMenu } from './user-menu';
import { DASHBOARD_HREF } from './workspace';

export async function SiteHeader({ locale }: { locale: string }) {
  const [t, actor] = await Promise.all([getTranslations(), getActor()]);
  const role = actor.userId && actor.role !== 'anonymous' ? actor.role : null;

  const publicItems: NavItem[] = [
    { href: '/track', label: t('nav.track') },
    { href: '/how-it-works', label: t('nav.howItWorks') },
    { href: '/success-stories', label: t('nav.stories') },
    { href: '/impact', label: t('nav.impact') },
    { href: '/resources', label: t('nav.resources') },
  ];

  const items: NavItem[] = role
    ? [{ href: DASHBOARD_HREF[role], label: t('nav.dashboard'), primary: true }, ...publicItems]
    : publicItems;

  return (
    <header className="border-line bg-surface relative border-b">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-3 sm:h-[76px] sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-h-11 shrink-0 items-center rounded-md">
          <span className="sm:hidden">
            <AkhraLogo name={t('brand.name')} tagline={t('brand.slogan')} compact />
          </span>
          <span className="hidden sm:inline">
            <AkhraLogo name={t('brand.name')} tagline={t('brand.slogan')} />
          </span>
        </Link>

        <NavLinks items={items} label={t('nav.main')} className="hidden xl:block" />

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex">
            <LocaleSwitcher label={t('nav.language')} />
          </span>
          <MobileMenu
            items={items}
            labels={{ open: t('nav.openMenu'), close: t('nav.closeMenu'), menu: t('nav.main') }}
          >
            <LocaleSwitcher label={t('nav.language')} />
          </MobileMenu>
          <UserMenu locale={locale} />
        </div>
      </div>
    </header>
  );
}
