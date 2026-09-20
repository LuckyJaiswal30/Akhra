import { ArrowRight, Bell } from 'lucide-react';
import { DISTRICT_BY_CODE, ROLE_LABELS, type Role } from '@akhra/shared';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { unreadCount } from '@/modules/notifications';
import { getActor } from '@/server/session';
import { ProfileMenu } from './profile-menu';

export async function UserMenu({ locale }: { locale: string }) {
  const actor = await getActor();
  const t = await getTranslations('nav');

  // Everyone signs in at the same door, so it is never folded into a menu: Akhra decides where a
  // person lands from the role on their account, and a portal that hides its one entrance below a
  // 1280px laptop is a portal most visitors never get into.
  if (!actor.userId || actor.role === 'anonymous') {
    return (
      <Link
        href="/sign-in"
        className={buttonVariants({ size: 'md', className: 'px-4 whitespace-nowrap xl:px-7' })}
      >
        {t('signIn')}
        <ArrowRight aria-hidden className="hidden h-4 w-4 sm:block" />
      </Link>
    );
  }

  const roleLabel = ROLE_LABELS[actor.role as Role];
  const district = actor.jurisdiction ? DISTRICT_BY_CODE[actor.jurisdiction] : undefined;
  const unread = await unreadCount(actor).catch(() => 0);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/notifications"
        aria-label={unread > 0 ? t('notificationsUnread', { count: unread }) : t('notifications')}
        className="border-line hover:bg-mint relative grid h-11 w-11 place-items-center rounded-full border transition-colors"
      >
        <Bell aria-hidden className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="bg-sal text-on-sal absolute -top-1 -right-1 min-w-5 rounded-full px-1 text-center text-[10px] leading-5 font-semibold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>
      <ProfileMenu
        name={actor.name ?? actor.email ?? ''}
        roleLabel={
          district
            ? t('districtOfficer', {
                district: locale === 'hi' ? district.nameHi : district.nameEn,
              })
            : actor.role === 'gov_admin'
              ? t('stateOfficer')
              : locale === 'hi'
                ? roleLabel.hi
                : roleLabel.en
        }
        labels={{ menu: t('accountMenu'), manage: t('manageAccount'), signOut: t('signOut') }}
      />
    </div>
  );
}
