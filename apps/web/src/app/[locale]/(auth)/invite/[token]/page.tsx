import { MailOpen } from 'lucide-react';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { JHARKHAND_DISTRICTS, ROLE_LABELS } from '@akhra/shared';
import { AuthShell } from '@/components/auth-shell';
import { Alert, Card } from '@/components/ui';
import { routing } from '@/i18n/routing';
import { InvitePanel, getAuthPolicy, previewInvite } from '@/modules/auth';
import { getActor } from '@/server/session';

function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ __clerk_ticket?: string }>;
}) {
  const [{ locale, token }, { __clerk_ticket: ticket }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const labels = {
    ...((await getMessages()).auth as Record<string, string>),
    ...((await getMessages()).invite as Record<string, string>),
  };
  const [preview, actor, { password }] = await Promise.all([
    previewInvite(token),
    getActor(),
    getAuthPolicy(),
  ]);
  const role = preview.role ? ROLE_LABELS[preview.role] : null;
  const district = JHARKHAND_DISTRICTS.find((d) => d.code === preview.jurisdictionCode);
  const districtName = district ? (locale === 'hi' ? district.nameHi : district.nameEn) : null;
  const masked = preview.email ? maskEmail(preview.email) : '';
  const viewer = !actor.userId
    ? ({ kind: 'signed-out' } as const)
    : actor.email?.toLowerCase() === preview.email
      ? ({ kind: 'ready' } as const)
      : ({ kind: 'mismatch', email: actor.email ?? '' } as const);

  return (
    <AuthShell locale={locale}>
      <Card className="p-6 sm:p-10">
        <div className="text-center">
          <span className="bg-sal-wash mx-auto grid h-14 w-14 place-items-center rounded-full">
            <MailOpen aria-hidden className="text-sal h-7 w-7" />
          </span>
          <h1 className="text-ink mt-4 text-3xl font-bold">{labels.inviteTitle}</h1>
        </div>
        {preview.state !== 'pending' ? (
          <div className="mt-6">
            <Alert tone="error" title={labels[`invite_${preview.state}`]}>
              {labels.askAgain}
            </Alert>
          </div>
        ) : (
          <>
            <dl className="bg-mint mt-6 grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-5 gap-y-2 rounded-xl px-4 py-4 text-sm">
              <dt className="text-subtle">{labels.invitedAs}</dt>
              <dd className="text-ink font-semibold">
                {role ? (locale === 'hi' ? role.hi : role.en) : ''}
              </dd>
              {preview.role === 'gov_admin' ? (
                <>
                  <dt className="text-subtle">{labels.covers}</dt>
                  <dd className="text-ink font-semibold">{districtName ?? labels.wholeState}</dd>
                </>
              ) : (
                <>
                  <dt className="text-subtle">{labels.forOrg}</dt>
                  <dd className="text-ink font-semibold">
                    {preview.organizationName ?? labels.forGovernment}
                  </dd>
                </>
              )}
              {preview.designation && (
                <>
                  <dt className="text-subtle">{labels.post}</dt>
                  <dd className="text-ink font-semibold">{preview.designation}</dd>
                </>
              )}
              <dt className="text-subtle">{labels.invitedEmail}</dt>
              <dd className="text-ink font-semibold break-all">{masked}</dd>
            </dl>
            <p className="text-subtle mt-3 text-xs">{labels.setByInviter}</p>
            <div className="mt-7">
              <InvitePanel
                token={token}
                invitedEmail={masked}
                viewer={viewer}
                hasAccount={preview.hasAccount ?? false}
                ticket={ticket ?? null}
                labels={labels}
                paths={{
                  signIn: `${prefix}/sign-in`,
                  signUp: `${prefix}/sign-up`,
                  invite: `${prefix}/invite/${token}`,
                  dashboard: `${prefix}/dashboard`,
                }}
                policy={password}
              />
            </div>
          </>
        )}
      </Card>
    </AuthShell>
  );
}
