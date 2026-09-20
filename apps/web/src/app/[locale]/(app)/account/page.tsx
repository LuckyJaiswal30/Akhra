import { currentUser } from '@clerk/nextjs/server';
import { BadgeCheck, Building2, Landmark, ShieldCheck, UserRound } from 'lucide-react';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { DISTRICT_BY_CODE, ROLE_LABELS, type Role } from '@akhra/shared';
import { Card } from '@/components/ui';
import {
  AccountDetails,
  AccountSecurity,
  ProfilePhoto,
  getAuthPolicy,
  getOwnProfile,
  listOrganizationName,
} from '@/modules/auth';
import { getActor } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('title') };
}

function Section({
  id,
  title,
  hint,
  Icon,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  Icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <Card className="scroll-mt-24 p-5 sm:p-6">
      <section id={id} aria-labelledby={id && `${id}-title`}>
        <div className="flex items-start gap-3">
          <span className="bg-sal-wash text-sal grid h-10 w-10 shrink-0 place-items-center rounded-full">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={id && `${id}-title`} className="text-ink text-lg font-semibold">
              {title}
            </h2>
            {hint && <p className="text-subtle mt-1 text-sm">{hint}</p>}
          </div>
        </div>
        <div className="border-line mt-5 border-t pt-5">{children}</div>
      </section>
    </Card>
  );
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await getActor();
  const profile = await getOwnProfile(actor);
  if (!actor.userId || !profile) redirect('/sign-in');

  const t = await getTranslations('account');
  const messages = await getMessages();
  const labels = {
    ...(messages.auth as Record<string, string>),
    ...(messages.security as Record<string, string>),
    ...(messages.account as Record<string, string>),
  };
  const isHindi = locale === 'hi';
  const roleLabel = ROLE_LABELS[actor.role as Role];
  const district = actor.jurisdiction ? DISTRICT_BY_CODE[actor.jurisdiction] : undefined;
  const [organisation, { password }, clerkUser] = await Promise.all([
    actor.organizationId ? listOrganizationName(actor.organizationId) : null,
    getAuthPolicy(),
    currentUser(),
  ]);
  const googleEmail =
    clerkUser?.externalAccounts.find((account) => account.provider.endsWith('google'))
      ?.emailAddress ?? null;
  const displayName = profile.name ?? profile.email;

  const checks = [
    { done: Boolean(profile.name), label: t('missingName'), field: 'profile-name' },
    { done: Boolean(profile.phone), label: t('missingPhone'), field: 'profile-phone' },
    { done: Boolean(profile.districtCode), label: t('missingDistrict'), field: 'profile-district' },
    { done: Boolean(profile.locality), label: t('missingLocality'), field: 'profile-locality' },
  ];
  const done = checks.filter((check) => check.done).length;
  const missing = checks.filter((check) => !check.done);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="text-ink text-2xl font-bold">{t('title')}</h1>
        <p className="text-subtle mt-1 text-sm">{t('subtitle')}</p>
      </header>

      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <ProfilePhoto fallbackImage={profile.image} name={displayName} labels={labels}>
            <p className="text-ink truncate text-xl font-semibold">{displayName}</p>
            <p className="text-subtle mt-1 flex flex-wrap items-center justify-center gap-2 text-sm break-all sm:justify-start">
              {profile.email}
              <span className="bg-sal-wash text-sal-deep inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                <BadgeCheck aria-hidden className="h-3.5 w-3.5" />
                {t('emailVerified')}
              </span>
            </p>
            <p className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="border-line text-ink rounded-full border px-2.5 py-0.5 text-xs font-medium">
                {isHindi ? roleLabel.hi : roleLabel.en}
              </span>
              {googleEmail && (
                <span className="border-line text-ink rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {t('methodGoogle')}
                </span>
              )}
            </p>
          </ProfilePhoto>
        </div>

        <div className="border-line bg-mint/50 border-t px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-ink font-medium">
              {missing.length === 0 ? t('completeDone') : t('completeTitle')}
            </p>
            <p className="text-subtle shrink-0">
              {t('progressLabel', { done, total: checks.length })}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={t('progressLabel', { done, total: checks.length })}
            aria-valuemin={0}
            aria-valuemax={checks.length}
            aria-valuenow={done}
            className="bg-line mt-2 h-2 overflow-hidden rounded-full"
          >
            <div
              className="bg-sal h-full rounded-full transition-[width]"
              style={{ width: `${(done / checks.length) * 100}%` }}
            />
          </div>
          {missing.length > 0 && (
            <>
              <p className="text-subtle mt-3 text-sm">{t('completeBody')}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {missing.map((check) => (
                  <li key={check.field}>
                    <a
                      href={`#${check.field}`}
                      className="border-sal/50 bg-surface text-sal hover:bg-sal-wash inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed px-3 text-sm font-medium"
                    >
                      + {check.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Card>

      <Section id="details" title={t('detailsTitle')} hint={t('detailsHint')} Icon={UserRound}>
        <AccountDetails profile={profile} labels={labels} locale={locale} />
      </Section>

      <Section
        id="security"
        title={t('methodsTitle')}
        hint={googleEmail ? t('emailViaGoogle') : t('methodsHint')}
        Icon={ShieldCheck}
      >
        <AccountSecurity
          labels={labels}
          policy={password}
          googleEmail={googleEmail}
          hadPassword={clerkUser?.passwordEnabled ?? false}
        />
      </Section>

      <Section title={t('roleTitle')} hint={t('roleHint')} Icon={Landmark}>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-subtle text-sm">{t('roleTitle')}</dt>
            <dd className="text-ink font-medium">{isHindi ? roleLabel.hi : roleLabel.en}</dd>
          </div>
          {district && (
            <div>
              <dt className="text-subtle text-sm">{t('jurisdiction')}</dt>
              <dd className="text-ink font-medium">
                {isHindi ? district.nameHi : district.nameEn}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-subtle flex items-center gap-1.5 text-sm">
              <Building2 aria-hidden className="h-3.5 w-3.5" />
              {t('organisation')}
            </dt>
            <dd className="text-ink font-medium">{organisation ?? t('none')}</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
