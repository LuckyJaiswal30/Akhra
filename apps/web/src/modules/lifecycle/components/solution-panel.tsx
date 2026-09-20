import {
  Building2,
  CircleCheckBig,
  CircleDashed,
  CircleDot,
  Handshake,
  XCircle,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { MilestoneStatus } from '@akhra/shared';
import { formatDate, formatNumber } from '@/lib/utils';
import type { PublicSolution } from '../public-solution';

const STEP_ICON: Record<MilestoneStatus, typeof CircleCheckBig> = {
  approved: CircleCheckBig,
  submitted: CircleDot,
  in_progress: CircleDot,
  rejected: XCircle,
  pending: CircleDashed,
};

const STEP_TONE: Record<MilestoneStatus, string> = {
  approved: 'text-sal',
  submitted: 'text-sky',
  in_progress: 'text-sky',
  rejected: 'text-danger',
  pending: 'text-subtle',
};

const RESULT_TONE = {
  passed: 'bg-sal-wash text-sal-deep',
  failed: 'bg-danger-wash text-danger',
  inconclusive: 'bg-well text-subtle',
} as const;

/**
 * What the institution is doing about a report, on the page the person who filed it actually reads.
 *
 * The tracker used to end at "routed to an institution", which tells a citizen that their problem
 * was passed on and nothing else. Everything below already existed — it was just locked behind a
 * sign-in that no reporter has.
 */
export async function SolutionPanel({
  solution,
  locale,
}: {
  solution: PublicSolution;
  locale: string;
}) {
  const [t, lifecycle] = await Promise.all([
    getTranslations('solution'),
    getTranslations('lifecycle'),
  ]);
  const tag = locale === 'hi' ? 'hi-IN' : 'en-IN';
  const date = (value: Date | string) => formatDate(value, tag);

  return (
    <section aria-labelledby="solution-heading" className="border-line border-b py-8">
      <h3 id="solution-heading" className="text-lg font-semibold">
        {t('heading')}
      </h3>

      <div className="border-line mt-4 rounded-2xl border p-5">
        <h4 className="text-ink text-xl font-bold">{solution.title}</h4>
        <p className="text-subtle mt-2">{solution.summary}</p>
        <ul className="text-subtle mt-4 space-y-1.5 text-sm">
          <li className="flex items-start gap-2">
            <Building2 aria-hidden className="text-sal mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t('leadBy', { org: solution.organizationName })}
              {solution.teamSize > 0 && ` · ${t('teamSize', { count: solution.teamSize })}`}
            </span>
          </li>
          {solution.partners.length > 0 && (
            <li className="flex items-start gap-2">
              <Handshake aria-hidden className="text-sal mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('withPartners', { partners: solution.partners.join(', ') })}</span>
            </li>
          )}
        </ul>
        <p className="text-subtle mt-3 text-sm">
          {solution.completedAt
            ? t('finishedOn', { date: date(solution.completedAt) })
            : solution.startedAt && t('since', { date: date(solution.startedAt) })}
        </p>
      </div>

      {solution.plan ? (
        <div className="bg-mint mt-4 rounded-2xl p-5">
          <h4 className="text-ink font-semibold">{t('planTitle')}</h4>
          <p className="text-subtle mt-1 text-sm">
            {solution.plan.approvedAt
              ? t('planApproved', { date: date(solution.plan.approvedAt) })
              : t('planApprovedUndated')}{' '}
            {t('planTimeline', { count: solution.plan.timelineMonths })}
          </p>
          <p className="text-ink mt-4 whitespace-pre-line">{solution.plan.abstract}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-sal-deep font-semibold">{t('planHow')}</dt>
              <dd className="text-subtle mt-0.5 whitespace-pre-line">
                {solution.plan.methodology}
              </dd>
            </div>
            <div>
              <dt className="text-sal-deep font-semibold">{t('planExpect')}</dt>
              <dd className="text-subtle mt-0.5 whitespace-pre-line">
                {solution.plan.expectedOutcomes}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-subtle bg-well mt-4 rounded-2xl p-5 text-sm">{t('waiting')}</p>
      )}

      {solution.milestones.length > 0 && (
        <div className="mt-6">
          <h4 className="text-ink font-semibold">{t('stepsTitle')}</h4>
          <p className="text-subtle mt-1 text-sm">{t('stepsHint')}</p>
          <ol className="mt-4 space-y-3">
            {solution.milestones.map((step) => {
              const Icon = STEP_ICON[step.status];
              return (
                <li key={step.id} className="flex items-start gap-3">
                  <Icon
                    aria-hidden
                    className={`mt-0.5 h-5 w-5 shrink-0 ${STEP_TONE[step.status]}`}
                  />
                  <div className="min-w-0">
                    <p className="text-ink">{step.title}</p>
                    <p className="text-subtle text-sm">
                      {lifecycle(`milestoneStatus_${step.status}`)}
                      {step.dueDate && ` · ${lifecycle('due')} ${date(step.dueDate)}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {solution.tests.length > 0 && (
        <div className="mt-6">
          <h4 className="text-ink font-semibold">{t('testsTitle')}</h4>
          <p className="text-subtle mt-1 text-sm">{t('testsHint')}</p>
          <ul className="mt-4 space-y-4">
            {solution.tests.map((test) => (
              <li key={test.id} className="border-line rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${RESULT_TONE[test.result]}`}
                  >
                    {lifecycle(`testResult_${test.result}`)}
                  </span>
                  <span className="text-subtle text-xs">
                    {t('testOn', { date: date(test.conductedOn) })}
                  </span>
                </div>
                <p className="text-ink mt-2 font-medium">{test.title}</p>
                <p className="text-subtle mt-1 text-sm">{test.findings}</p>
                <p className="text-subtle mt-2 text-sm">
                  <span className="font-medium">{t('testMethod')}: </span>
                  {test.method}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {solution.outcomes.length > 0 && (
        <div className="bg-sal-wash mt-6 rounded-2xl p-5">
          <h4 className="text-ink font-semibold">{t('resultTitle')}</h4>
          <p className="text-subtle mt-1 text-sm">{t('resultHint')}</p>
          <ul className="mt-4 space-y-4">
            {solution.outcomes.map((outcome) => (
              <li key={outcome.id}>
                <p className="text-sal-deep text-xs font-semibold tracking-wide uppercase">
                  {lifecycle(`outcomeType_${outcome.type}`)}
                  {outcome.ipStatus && ` · ${lifecycle(`ipStatus_${outcome.ipStatus}`)}`}
                </p>
                <p className="text-ink mt-1 font-medium">{outcome.title}</p>
                {outcome.detail && <p className="text-subtle mt-1 text-sm">{outcome.detail}</p>}
                {outcome.metricName && outcome.metricValue !== null && (
                  <p className="text-subtle mt-1">
                    <span className="text-ink text-2xl font-bold tabular-nums">
                      {formatNumber(outcome.metricValue, tag)}
                    </span>{' '}
                    {outcome.metricName}
                  </p>
                )}
                {outcome.reference && (
                  <p className="text-subtle mt-1 font-mono text-xs">{outcome.reference}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
