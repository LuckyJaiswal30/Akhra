import { getTranslations } from 'next-intl/server';
import type { Role } from '@akhra/shared';
import { AkhraLogo } from '@/components/brand/akhra-logo';
import { Link } from '@/i18n/navigation';
import { getActor } from '@/server/session';
import { LocaleSwitcher } from './locale-switcher';
import { MobileMenu } from './mobile-menu';
import { NavLinks, type NavItem } from './nav-links';
import { UserMenu } from './user-menu';

/**
 * The front door of each role's own work. Signed out, the header sells the platform; signed in, the
 * first thing in it should be the desk the person actually sits at — an officer should never have to
 * learn a URL or go back to the home page to reach their queue.
 */
const WORKSPACE: Record<Role, { href: NavItem['href']; key: string }> = {
  citizen: { href: '/dashboard', key: 'myReports' },
  student: { href: '/university/projects', key: 'myProjects' },
  faculty: { href: '/university', key: 'institution' },
  university_admin: { href: '/university', key: 'institution' },
  industry_partner: { href: '/industry', key: 'industry' },
  industry_admin: { href: '/industry', key: 'industry' },
  dept_officer: { href: '/department', key: 'department' },
  gov_admin: { href: '/government', key: 'stateDashboard' },
  super_admin: { href: '/admin', key: 'administration' },
};

export async function SiteHeader({ locale }: { locale: string }) {
  const [t, actor] = await Promise.all([getTranslations(), getActor()]);
  const role = actor.userId && actor.role !== 'anonymous' ? actor.role : null;

  const publicItems: NavItem[] = [
    { href: '/how-it-works', label: t('nav.howItWorks') },
    { href: '/success-stories', label: t('nav.stories') },
    { href: '/impact', label: t('nav.impact') },
    { href: '/resources', label: t('nav.resources') },
  ];

  // Signed in, the two pages written for newcomers give way to the person's own work. The full
  // public list is still one tap away in the mobile menu.
  const workspace: NavItem | null = role
    ? { href: WORKSPACE[role].href, label: t(`nav.${WORKSPACE[role].key}`), primary: true }
    : null;
  const items: NavItem[] = workspace
    ? [
        workspace,
        ...(role === 'citizen' ? [{ href: '/submit' as const, label: t('nav.submit') }] : []),
        { href: '/impact', label: t('nav.impact') },
        { href: '/resources', label: t('nav.resources') },
      ]
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
            items={workspace ? [workspace, ...publicItems] : publicItems}
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
