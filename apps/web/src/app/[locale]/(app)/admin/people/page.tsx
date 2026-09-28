import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Search } from 'lucide-react';
import { DISTRICT_BY_CODE, ROLE_LABELS, ROLES, type Role } from '@akhra/shared';
import { Button, Input, Select } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import { ReactivateButton, SuspendButton, listAccounts } from '@/modules/auth';
import { requirePageRole } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: t('peopleTitle') };
}

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const actor = await requirePageRole('super_admin');
  const labels = (await getMessages()).admin as Record<string, string>;
  const isHindi = locale === 'hi';
  const intlLocale = isHindi ? 'hi-IN' : 'en-IN';
  const roleLabel = (role: Role) => (isHindi ? ROLE_LABELS[role].hi : ROLE_LABELS[role].en);
  const districtName = (code: string | null) => {
    const district = code ? DISTRICT_BY_CODE[code] : undefined;
    return district ? (isHindi ? district.nameHi : district.nameEn) : null;
  };
  const fill = (template: string | undefined, values: Record<string, string | number>) =>
    (template ?? '').replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

  const list = await listAccounts(actor, {
    q: search.q,
    role: search.role,
    status: search.status,
    page: Number(search.page) || 1,
  });
  const pageHref = (page: number) => ({
    pathname: '/admin/people' as const,
    query: { ...search, page: String(page) },
  });

  const tiles = [
    { label: labels.peopleAll, value: list.summary.all },
    { label: labels.peopleCitizens, value: list.summary.citizens },
    { label: labels.peopleThisWeek, value: list.summary.joinedThisWeek },
    { label: labels.peopleSuspended, value: list.summary.suspended },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{labels.peopleTitle}</h1>
        <p className="text-subtle mt-1 text-sm">{labels.peopleSubtitle}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="border-line rounded-lg border px-4 py-3">
            <dt className="text-subtle text-sm">{tile.label}</dt>
            <dd className="text-ink mt-0.5 text-2xl font-bold tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_10rem_auto]">
        <label className="sr-only" htmlFor="people-q">
          {labels.searchLabel}
        </label>
        <Input
          id="people-q"
          name="q"
          type="search"
          defaultValue={search.q ?? ''}
          placeholder={labels.peopleSearchPlaceholder}
          icon={<Search />}
          className="rounded-full pr-5 pl-12"
          autoComplete="off"
        />
        <label className="sr-only" htmlFor="people-role">
          {labels.peopleRole}
        </label>
        <Select id="people-role" name="role" defaultValue={search.role ?? ''}>
          <option value="">{labels.peopleAnyRole}</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="people-status">
          {labels.peopleStatus}
        </label>
        <Select id="people-status" name="status" defaultValue={search.status ?? ''}>
          <option value="">{labels.peopleAnyStatus}</option>
          <option value="active">{labels.peopleActive}</option>
          <option value="suspended">{labels.peopleSuspendedOption}</option>
        </Select>
        <Button type="submit" variant="secondary">
          {labels.peopleApply}
        </Button>
      </form>

      <section aria-label={labels.peopleTitle}>
        {list.accounts.length === 0 ? (
          <p className="text-subtle border-line rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            {labels.searchNone}
          </p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {list.accounts.map((account) => {
              const name = account.name ?? account.email;
              const place =
                account.organizationName ??
                districtName(account.jurisdictionCode) ??
                districtName(account.districtCode);
              const isSelf = account.id === actor.userId;
              return (
                <li
                  key={account.id}
                  className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="truncate">{name}</span>
                      <span className="bg-well text-subtle rounded-full px-2 py-0.5 text-xs font-normal">
                        {roleLabel(account.role)}
                      </span>
                      {account.status === 'suspended' && (
                        <span className="bg-danger-wash text-danger rounded-full px-2 py-0.5 text-xs">
                          {labels.peopleSuspendedBadge}
                        </span>
                      )}
                      {account.status === 'active' && !account.profileComplete && (
                        <span className="bg-warning-wash text-warning rounded-full px-2 py-0.5 text-xs">
                          {labels.peopleIncomplete}
                        </span>
                      )}
                    </p>
                    <p className="text-subtle mt-0.5 text-xs break-all">{account.email}</p>
                    <p className="text-subtle mt-0.5 text-xs">
                      {[
                        place,
                        fill(labels.peopleJoined, {
                          date: formatDate(account.createdAt, intlLocale),
                        }),
                        fill(labels.peopleReports, { count: account.reports }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {account.suspension && (
                      <p className="text-danger mt-1 text-xs">
                        {fill(labels.peopleSuspendedOn, {
                          date: formatDate(account.suspension.at, intlLocale),
                        })}
                        {account.suspension.reason && `: ${account.suspension.reason}`}
                      </p>
                    )}
                  </div>
                  <div>
                    {isSelf ? (
                      <span className="text-subtle text-xs">{labels.peopleYou}</span>
                    ) : account.status === 'active' ? (
                      <SuspendButton
                        userId={account.id}
                        name={name}
                        unreviewedReports={account.unreviewedReports}
                        keptReports={account.keptReports}
                        labels={labels}
                      />
                    ) : (
                      <ReactivateButton
                        userId={account.id}
                        name={name}
                        removedReports={account.removedReports}
                        labels={labels}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <nav
        className="flex items-center justify-between gap-3 text-sm"
        aria-label={labels.peoplePages}
      >
        <p className="text-subtle">
          {fill(labels.peopleShowing, { shown: list.accounts.length, total: list.total })}
        </p>
        <div className="flex gap-2">
          {list.page > 1 && (
            <Link href={pageHref(list.page - 1)} className="text-sal font-medium underline">
              {labels.peoplePrevious}
            </Link>
          )}
          {list.page < list.pages && (
            <Link href={pageHref(list.page + 1)} className="text-sal font-medium underline">
              {labels.peopleNext}
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
