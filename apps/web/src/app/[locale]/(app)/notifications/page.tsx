import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listNotifications, markAllReadAction } from '@/modules/notifications';
import { Button } from '@/components/ui';
import { requireActor } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return { title: t('title') };
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireActor();
  const t = await getTranslations('notifications');
  const items = await listNotifications(actor);
  const hasUnread = items.some((n) => n.readAt == null);
  const timeFormat = new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-subtle mt-1 text-sm">{t('subtitle')}</p>
        </div>
        {hasUnread && (
          <form action={markAllReadAction}>
            <Button type="submit" size="sm" variant="secondary">
              {t('markAllRead')}
            </Button>
          </form>
        )}
      </header>

      {items.length === 0 ? (
        <p className="border-line text-subtle border-y px-6 py-10 text-center text-sm">
          {t('empty')}
        </p>
      ) : (
        <ul className="divide-line border-line bg-surface shadow-card divide-y rounded-2xl border">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`/api/notifications/${item.id}/open`}
                className="hover:bg-well/40 flex gap-3 px-4 py-3.5 transition-colors"
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-sal'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${item.readAt ? '' : 'font-medium'}`}>
                    {item.title}
                    {!item.readAt && <span className="sr-only"> ({t('unread')})</span>}
                  </span>
                  {item.body && (
                    <span className="text-subtle mt-0.5 line-clamp-2 block text-sm">
                      {item.body}
                    </span>
                  )}
                  <span className="text-subtle mt-1 block text-xs">
                    {timeFormat.format(new Date(item.createdAt))}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
