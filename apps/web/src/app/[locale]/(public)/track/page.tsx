import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import {
  DOMAIN_DEFINITIONS,
  TERMINAL_STATUSES,
  type Domain,
  type ProblemStatus,
  DISTRICT_BY_CODE,
  reopenClosesAt,
} from '@akhra/shared';
import {
  hasSupported,
  listProblemFiles,
  StatusTimeline,
  SupportButton,
  trackByRefCode,
} from '@/modules/citizen';
import { ReporterDecision } from '@/modules/classification';
import { publicSolution, SolutionPanel } from '@/modules/lifecycle';
import { ProblemFiles } from '@/components/problem-files';
import {
  buildThreadLabels,
  getThreadAccess,
  listThread,
  ThreadPanel,
} from '@/modules/notifications';

import { getActor } from '@/server/session';
import { Alert, Button, Field, Input, StatusBadge } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'track' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  const ref = [search.ref].flat()[0]?.trim() || undefined;
  setRequestLocale(locale);

  const t = await getTranslations('track');
  const trackMessages = (await getMessages()).track as Record<string, string>;
  const isHindi = locale === 'hi';
  const problem = ref ? await trackByRefCode(ref) : null;
  const actor = await getActor();
  const isOwnReport = Boolean(actor.userId && problem?.submitterId === actor.userId);
  const canReopen =
    problem?.resolutionTrack === 'department' &&
    problem.reopenCount === 0 &&
    problem.actionTakenAt !== null &&
    reopenClosesAt(problem.actionTakenAt) > new Date();
  const canReopenClosed = problem?.status === 'closed' && canReopen;
  const thread = problem ? await listThread(actor, problem.id) : [];
  const threadAccess = problem
    ? await getThreadAccess(actor, problem.id)
    : { canPost: false, canPostInternal: false };
  const threadLabels = await buildThreadLabels(locale);
  const files = problem ? await listProblemFiles(actor, problem.id) : [];
  const solution = problem ? await publicSolution(problem.id) : null;
  const canSupport =
    problem !== null &&
    !isOwnReport &&
    !TERMINAL_STATUSES.includes(problem.status as ProblemStatus);
  const supported = problem && canSupport ? await hasSupported(actor, problem.id) : false;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-subtle mt-2">{t('subtitle')}</p>

      <form method="get" className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label={t('refCode')} htmlFor="ref">
            <Input
              id="ref"
              name="ref"
              defaultValue={ref ?? ''}
              placeholder={t('refCodePlaceholder')}
              className="font-mono uppercase placeholder:normal-case"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </Field>
        </div>
        <Button type="submit" className="min-h-11 sm:min-h-10">
          {t('lookUp')}
        </Button>
      </form>

      {ref && !problem && (
        <div className="mt-6">
          <Alert tone="error">{t('notFound')}</Alert>
          <p className="text-subtle mt-3 text-sm">
            {t('notFoundHelp')}{' '}
            <Link href="/submit" className="text-sal font-medium underline">
              {t('reportNew')}
            </Link>
          </p>
        </div>
      )}

      {problem && (
        <article className="mt-10">
          <header className="border-line border-b pb-8">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-subtle font-mono text-sm">{problem.refCode}</p>
              <StatusBadge status={problem.status as ProblemStatus} locale={locale} />
            </div>
            <h2 className="mt-3 text-2xl leading-snug font-bold">{problem.title}</h2>
            {problem.mergedInto && (
              <div className="border-sal/30 bg-sal-wash mt-4 rounded-lg border p-4">
                <p className="text-ink font-semibold">
                  {t('mergedTitle', { ref: problem.mergedInto.refCode })}
                </p>
                <p className="text-subtle mt-1 text-sm">{t('mergedBody')}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <StatusBadge
                    status={problem.mergedInto.status as ProblemStatus}
                    locale={locale}
                  />
                  <Link
                    href={{ pathname: '/track', query: { ref: problem.mergedInto.refCode } }}
                    className="text-sal font-medium underline"
                  >
                    {t('mergedFollow', { ref: problem.mergedInto.refCode })}
                  </Link>
                </div>
              </div>
            )}
            <p className="text-subtle mt-3 whitespace-pre-line">{problem.description}</p>

            <dl className="mt-6 grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-2 text-sm">
              <Detail label={t('district')}>
                {(isHindi && DISTRICT_BY_CODE[problem.districtCode]?.nameHi) ||
                  problem.districtName}
                {problem.blockName && <span className="text-subtle">, {problem.blockName}</span>}
              </Detail>
              <Detail label={t('category')}>
                {problem.domain
                  ? isHindi
                    ? DOMAIN_DEFINITIONS[problem.domain as Domain].labelHi
                    : DOMAIN_DEFINITIONS[problem.domain as Domain].labelEn
                  : '—'}
              </Detail>
              <Detail label={t('reportedOn')}>
                {formatDate(problem.createdAt, isHindi ? 'hi-IN' : 'en-IN')}
              </Detail>
              {problem.assignedOrgName && (
                <Detail label={t('departmentLabel')}>{problem.assignedOrgName}</Detail>
              )}
              {problem.dueAt && problem.status === 'assigned' && (
                <Detail label={t('answerDue')}>
                  {formatDate(problem.dueAt, isHindi ? 'hi-IN' : 'en-IN')}
                </Detail>
              )}
            </dl>

            {canSupport && (
              <div className="mt-6">
                <SupportButton
                  problemId={problem.id}
                  initial={{ supportCount: problem.supportCount, supported }}
                  signedIn={Boolean(actor.userId)}
                  returnPath={`/track?ref=${problem.refCode}`}
                  labels={{
                    support: t('support'),
                    withdraw: t('supportWithdraw'),
                    count: trackMessages.supportCount!,
                    countOne: trackMessages.supportCountOne!,
                    countNone: trackMessages.supportCountNone!,
                    signInToSupport: t('signInToSupport'),
                  }}
                />
              </div>
            )}
          </header>

          {(problem.status === 'action_taken' || canReopenClosed) && (
            <section className="border-line border-b py-8">
              <ReporterDecision
                refCode={problem.refCode}
                actionTakenNote={problem.actionTakenNote}
                needsPhone={!isOwnReport}
                reopenOnly={problem.status === 'closed'}
                canReopen={canReopen}
                labels={{
                  decisionTitle:
                    problem.status === 'closed' ? t('reopenTitle') : t('decisionTitle'),
                  decisionHint:
                    problem.status === 'closed'
                      ? t('reopenHint', {
                          date: formatDate(
                            reopenClosesAt(problem.actionTakenAt!),
                            isHindi ? 'hi-IN' : 'en-IN',
                          ),
                        })
                      : canReopen
                        ? t('decisionHint')
                        : t('decisionHintFinal'),
                  confirmFixed: t('confirmFixed'),
                  notFixed: t('notFixed'),
                  reopenReason: t('reopenReason'),
                  reopenPlaceholder: t('reopenPlaceholder'),
                  phoneLast4: t('phoneLast4'),
                  phoneLast4Hint: t('phoneLast4Hint'),
                  saving: t('saving'),
                }}
              />
            </section>
          )}

          <section aria-labelledby="history-heading" className="border-line border-b py-8">
            <h3 id="history-heading" className="text-lg font-semibold">
              {t('history')}
            </h3>
            <div className="mt-5">
              <StatusTimeline
                currentStatus={problem.status as ProblemStatus}
                events={problem.timeline}
                locale={locale}
                track={problem.resolutionTrack ?? 'research'}
              />
            </div>
          </section>

          {solution && <SolutionPanel solution={solution} locale={locale} />}

          {problem.routedTo.length > 0 && (
            <section aria-labelledby="routed-heading" className="border-line border-b py-8">
              <h3 id="routed-heading" className="text-lg font-semibold">
                {t('routedTo')}
              </h3>
              <ul className="divide-line border-line mt-4 divide-y border-y">
                {problem.routedTo.map((org) => (
                  <li
                    key={org.name}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm"
                  >
                    <span className="font-medium">{org.name}</span>
                    <span className="text-subtle">{t(`routingResponse_${org.response}`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {files.length > 0 && (
            <section aria-labelledby="files-heading" className="border-line border-b py-8">
              <h3 id="files-heading" className="text-lg font-semibold">
                {t('attachments')}
              </h3>
              <ProblemFiles files={files} className="mt-4" />
            </section>
          )}

          <div className="pt-8">
            <ThreadPanel
              problemId={problem.id}
              returnPath="/track"
              messages={thread}
              access={threadAccess}
              locale={locale}
              labels={threadLabels}
            />
          </div>
        </article>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-subtle">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </>
  );
}
