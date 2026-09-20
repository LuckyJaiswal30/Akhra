import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ROLE_LABELS } from '@akhra/shared';
import {
  InviteForm,
  listInvites,
  listOrganizationPeople,
  RevokeInviteButton,
} from '@/modules/auth';
import { requirePageRole } from '@/server/session';

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('industry_admin', 'industry_partner');
  const t = await getTranslations('industry');
  const labels = (await getMessages()).team as Record<string, string>;
  const isHindi = locale === 'hi';
  const roleLabel = (role: keyof typeof ROLE_LABELS) =>
    isHindi ? ROLE_LABELS[role].hi : ROLE_LABELS[role].en;
  const isAdmin = actor.role === 'industry_admin';
  const [people, invites] = await Promise.all([
    listOrganizationPeople(actor),
    isAdmin ? listInvites(actor) : Promise.resolve([]),
  ]);
  const pending = invites.filter((invite) => invite.state === 'pending');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </header>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="members-heading" className="space-y-3">
          <h2 id="members-heading" className="text-lg font-medium">
            {labels.people}
          </h2>
          <p className="text-subtle text-sm">{labels.subtitle}</p>
          <ul className="divide-line border-line divide-y border-y">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-baseline justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{person.name ?? person.email}</p>
                  <p className="text-subtle text-xs">{person.email}</p>
                </div>
                <p className="text-subtle text-right text-xs">
                  {roleLabel(person.role)}
                  <br />
                  {labels[`status_${person.status}`]}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="invite-heading" className="space-y-4">
          <h2 id="invite-heading" className="text-lg font-medium">
            {labels.inviteTitle}
          </h2>
          {isAdmin ? (
            <>
              <p className="text-subtle text-sm">{labels.inviteHint}</p>
              <InviteForm
                roles={[
                  { value: 'industry_partner', label: roleLabel('industry_partner') },
                  { value: 'industry_admin', label: roleLabel('industry_admin') },
                ]}
                labels={labels}
              />
              <h3 className="pt-4 font-medium">{labels.pending}</h3>
              {pending.length === 0 ? (
                <p className="text-subtle text-sm">{labels.noPending}</p>
              ) : (
                <ul className="divide-line border-line divide-y border-y">
                  {pending.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0">
                        {invite.email}
                        <br />
                        <span className="text-subtle text-xs">{roleLabel(invite.role)}</span>
                      </span>
                      <RevokeInviteButton inviteId={invite.id} label={labels.revoke!} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-subtle text-sm">{labels.onlyAdmins}</p>
          )}
        </section>
      </div>
    </div>
  );
}
