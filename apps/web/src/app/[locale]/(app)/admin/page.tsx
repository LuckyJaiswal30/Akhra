import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { JHARKHAND_DISTRICTS, ROLE_LABELS } from '@akhra/shared';
import {
  InviteForm,
  listGovernmentAdministrators,
  listInvites,
  OnboardOrganizationForm,
  PeopleFilter,
  PromoteButton,
  RepostForm,
  RevokeInviteButton,
} from '@/modules/auth';
import { listDepartments } from '@/modules/classification';
import { formatDate } from '@/lib/utils';
import { requirePageRole } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: t('title') };
}

const fill = (template: string | undefined, values: Record<string, string>): string =>
  (template ?? '').replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

const INVITE_STATE_TONE: Record<string, string> = {
  pending: 'border-warning/40 bg-warning-wash text-warning',
  redeemed: 'border-sal/40 bg-sal-wash text-sal-deep',
  expired: 'border-line bg-well text-subtle',
  revoked: 'border-danger/40 bg-danger-wash text-danger',
};

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('super_admin');
  const messages = await getMessages();
  const labels = messages.admin as Record<string, string>;
  const isHindi = locale === 'hi';
  /**
   * Designations are free text from an appointment order and are almost always written in English,
   * whichever language the page is in. Comparing against the English label as well as the shown one
   * keeps "District Officer, Deoghar" from being printed twice under a Hindi heading.
   */
  const englishLabels = isHindi
    ? ((await getMessages({ locale: 'en' })).admin as Record<string, string>)
    : labels;
  const roleLabel = (role: keyof typeof ROLE_LABELS) =>
    isHindi ? ROLE_LABELS[role].hi : ROLE_LABELS[role].en;
  const officerLabel = (code: string) => {
    const district = JHARKHAND_DISTRICTS.find((d) => d.code === code);
    return (labels.districtOfficer ?? '').replace(
      '{district}',
      district ? (isHindi ? district.nameHi : district.nameEn) : code,
    );
  };
  const officerLabelEn = (code: string) => {
    const district = JHARKHAND_DISTRICTS.find((d) => d.code === code);
    return (englishLabels.districtOfficer ?? '').replace('{district}', district?.nameEn ?? code);
  };
  const [invites, administrators, departments] = await Promise.all([
    listInvites(actor),
    listGovernmentAdministrators(actor),
    listDepartments(),
  ]);
  const departmentName = new Map(departments.map((d) => [d.id, d.name] as const));
  const departmentOptions = [...departments]
    .map((d) => ({ value: d.id, label: d.name }))
    .sort((a, b) => a.label.localeCompare(b.label, isHindi ? 'hi' : 'en'));
  const districtsByName = [...JHARKHAND_DISTRICTS].sort((a, b) =>
    isHindi ? a.nameHi.localeCompare(b.nameHi, 'hi') : a.nameEn.localeCompare(b.nameEn),
  );
  const officersByDistrict = new Map(
    administrators
      .filter((person) => person.jurisdictionCode && person.status === 'active')
      .map((person) => [person.jurisdictionCode!, person.name ?? person.email] as const),
  );
  const coveredDistricts = new Set(officersByDistrict.keys());
  const pendingInvites = invites.filter((invite) => invite.state === 'pending');
  /** Actionable invitations first, then alphabetically, so a known address is quick to find. */
  const sortedInvites = [...invites].sort(
    (a, b) =>
      Number(b.state === 'pending') - Number(a.state === 'pending') ||
      a.email.localeCompare(b.email),
  );
  const invitePosting = (invite: (typeof invites)[number]) =>
    invite.jurisdictionCode
      ? officerLabel(invite.jurisdictionCode)
      : (invite.organizationName ??
        (invite.role === 'gov_admin' ? labels.stateDesk : labels.government));
  /** Only a pending invitation has an expiry worth showing; the rest have already been settled. */
  const inviteExpiry = (invite: (typeof invites)[number]) =>
    invite.state === 'pending'
      ? formatDate(invite.expiresAt, isHindi ? 'hi-IN' : 'en-IN')
      : '\u2014';
  const summary = [
    { value: administrators.length, label: labels.summaryOfficers },
    {
      value: `${coveredDistricts.size}/${JHARKHAND_DISTRICTS.length}`,
      label: labels.summaryCoverage,
      warn: coveredDistricts.size < JHARKHAND_DISTRICTS.length,
    },
    { value: pendingInvites.length, label: labels.summaryPending },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <h1 className="text-2xl font-bold">{labels.title}</h1>
          <p className="text-subtle mt-1 text-sm">{labels.subtitle}</p>
        </div>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg border px-4 py-3 ${item.warn ? 'border-warning/50 bg-warning-wash' : 'border-line'}`}
          >
            <dt className="text-subtle text-sm">{item.label}</dt>
            <dd className="text-ink mt-0.5 text-2xl font-bold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="admins-heading" className="space-y-4">
        <div>
          <h2 id="admins-heading" className="text-lg font-medium">
            {labels.adminsTitle}
          </h2>
          <p className="text-subtle mt-1 text-sm">{labels.adminsHint}</p>
        </div>
        <PeopleFilter
          labels={labels}
          people={administrators.map((person) => {
            const posting =
              person.role === 'dept_officer'
                ? ('department' as const)
                : person.jurisdictionCode
                  ? ('district' as const)
                  : ('state' as const);
            const postingLine = person.jurisdictionCode
              ? officerLabel(person.jurisdictionCode)
              : person.role === 'dept_officer' && person.organizationId
                ? (departmentName.get(person.organizationId) ?? roleLabel(person.role))
                : person.role === 'gov_admin'
                  ? labels.stateDesk
                  : roleLabel(person.role);
            // A district officer's designation usually restates their district word for word.
            // Printing both is a stutter, so the designation only appears when it adds something.
            const sameAsPosting = [
              postingLine,
              person.jurisdictionCode && officerLabelEn(person.jurisdictionCode),
            ]
              .filter(Boolean)
              .map((text) => text!.trim().toLowerCase());
            const designation =
              person.designation && !sameAsPosting.includes(person.designation.trim().toLowerCase())
                ? person.designation
                : null;
            return {
              id: person.id,
              haystack: [person.name, person.email, postingLine, person.designation]
                .filter(Boolean)
                .join(' ')
                .toLowerCase(),
              card: (
                <>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{person.name ?? person.email}</p>
                    <p className="text-subtle text-xs break-all">{person.email}</p>
                    <p className="text-ink mt-1 text-xs font-medium">{postingLine}</p>
                    {designation && <p className="text-subtle text-xs">{designation}</p>}
                  </div>
                  {/* No mt-auto: a card with one action would otherwise strand it at the bottom,
                      level with its neighbours' second button and adrift from its own text. */}
                  {person.status === 'active' && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {person.id === actor.userId ? (
                        <p className="text-subtle text-xs">{labels.repostSelf}</p>
                      ) : (
                        <>
                          <RepostForm
                            userId={person.id}
                            person={{
                              name: person.name ?? person.email,
                              email: person.email,
                              phone: person.phone,
                              image: person.image,
                            }}
                            current={{
                              posting,
                              jurisdictionCode: person.jurisdictionCode,
                              organizationId: person.organizationId,
                              designation: person.designation,
                              label: postingLine ?? '',
                            }}
                            demotesSuperAdmin={person.role === 'super_admin'}
                            departments={departmentOptions}
                            locale={locale}
                            labels={labels}
                          />
                          {person.role === 'gov_admin' && (
                            <PromoteButton
                              userId={person.id}
                              person={{
                                name: person.name ?? person.email,
                                email: person.email,
                                phone: person.phone,
                                image: person.image,
                              }}
                              postingLabel={postingLine ?? ''}
                              labels={labels}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              ),
            };
          })}
        />
      </section>

      <section aria-labelledby="coverage-heading" className="space-y-4">
        <div>
          <h2 id="coverage-heading" className="text-lg font-medium">
            {labels.coverageTitle}
          </h2>
          <p className="text-subtle mt-1 text-sm">{labels.coverageHint}</p>
          <p className="text-subtle mt-1 text-sm font-medium">
            {fill(labels.coverageCovered, {
              count: String(coveredDistricts.size),
              total: String(JHARKHAND_DISTRICTS.length),
            })}
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {districtsByName.map((district) => {
            const officer = officersByDistrict.get(district.code);
            return (
              <li
                key={district.code}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${officer ? 'border-line' : 'border-warning/50 bg-warning-wash'}`}
              >
                <span className="font-medium">
                  {locale === 'hi' ? district.nameHi : district.nameEn}
                </span>
                <span className="text-subtle text-xs">{officer ?? labels.coverageGap}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="invites-heading" className="space-y-4">
        <h2 id="invites-heading" className="text-lg font-medium">
          {labels.invitesTitle}
        </h2>
        {invites.length === 0 ? (
          <p className="text-subtle text-sm">{labels.noInvites}</p>
        ) : (
          <>
            <ul className="divide-line border-line divide-y border-y sm:hidden">
              {sortedInvites.map((invite) => (
                <li key={invite.id} className="space-y-1 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium break-all">{invite.email}</p>
                    <span
                      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${INVITE_STATE_TONE[invite.state]}`}
                    >
                      {labels[`state_${invite.state}`]}
                    </span>
                  </div>
                  <p className="text-subtle">
                    {roleLabel(invite.role)}, {invitePosting(invite)}
                  </p>
                  {invite.state === 'pending' && (
                    <p className="text-subtle text-xs">
                      {labels.colExpires}: {inviteExpiry(invite)}
                    </p>
                  )}
                  {invite.state === 'pending' && (
                    <RevokeInviteButton inviteId={invite.id} label={labels.revoke!} />
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-line text-subtle border-b text-xs">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {labels.colEmail}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {labels.colRole}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {labels.colPosting}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {labels.colState}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      {labels.colExpires}
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">{labels.revoke}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvites.map((invite) => (
                    <tr key={invite.id} className="border-line border-b last:border-0">
                      <td className="min-w-48 py-2.5 pr-4">{invite.email}</td>
                      <td className="py-2.5 pr-4">{roleLabel(invite.role)}</td>
                      <td className="min-w-48 py-2.5 pr-4">{invitePosting(invite)}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${INVITE_STATE_TONE[invite.state]}`}
                        >
                          {labels[`state_${invite.state}`]}
                        </span>
                      </td>
                      <td className="text-subtle py-2.5 pr-4 tabular-nums">
                        {inviteExpiry(invite)}
                      </td>
                      <td className="py-2.5 text-right">
                        {invite.state === 'pending' && (
                          <RevokeInviteButton inviteId={invite.id} label={labels.revoke!} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <section aria-labelledby="grant-heading" className="space-y-6">
        <div>
          <h2 id="grant-heading" className="text-lg font-medium">
            {labels.grantTitle}
          </h2>
          <p className="text-subtle mt-1 text-sm">{labels.grantHint}</p>
        </div>
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          <section aria-labelledby="onboard-heading" className="space-y-4">
            <div>
              <h2 id="onboard-heading" className="text-lg font-medium">
                {labels.onboardTitle}
              </h2>
              <p className="text-subtle mt-1 text-sm">{labels.onboardHint}</p>
            </div>
            <OnboardOrganizationForm labels={labels} locale={locale} />
          </section>

          <section aria-labelledby="gov-heading" className="space-y-4">
            <div>
              <h2 id="gov-heading" className="text-lg font-medium">
                {labels.govTitle}
              </h2>
              <p className="text-subtle mt-1 text-sm">{labels.govHint}</p>
            </div>
            <InviteForm
              roles={[{ value: 'gov_admin', label: roleLabel('gov_admin') }]}
              districts
              locale={locale}
              labels={labels}
            />
          </section>

          <section aria-labelledby="dept-heading" className="space-y-4">
            <div>
              <h2 id="dept-heading" className="text-lg font-medium">
                {labels.deptTitle}
              </h2>
              <p className="text-subtle mt-1 text-sm">{labels.deptHint}</p>
            </div>
            <InviteForm
              roles={[{ value: 'dept_officer', label: roleLabel('dept_officer') }]}
              organizations={departmentOptions}
              locale={locale}
              labels={labels}
            />
          </section>
        </div>
      </section>
    </div>
  );
}
