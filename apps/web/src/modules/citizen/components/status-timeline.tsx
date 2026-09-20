import { useTranslations } from 'next-intl';
import {
  STATUS_DEFINITIONS,
  trackSteps,
  type ProblemStatus,
  type ResolutionTrack,
} from '@akhra/shared';
import { Alert } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  toStatus: string;
  note: string | null;
  actorLabel: string | null;
  createdAt: Date;
}

export function StatusTimeline({
  currentStatus,
  events,
  locale,
  track = 'research',
}: {
  currentStatus: ProblemStatus;
  events: TimelineEvent[];
  locale: string;
  track?: ResolutionTrack;
}) {
  const t = useTranslations('track');
  const isHindi = locale === 'hi';
  const current = STATUS_DEFINITIONS[currentStatus];
  const currentLabel = isHindi ? current.labelHi : current.labelEn;
  const steps = trackSteps(track);
  const reachedIndex = steps.indexOf(currentStatus);
  const isOffTrack = reachedIndex === -1;

  return (
    <div className="space-y-8">
      {isOffTrack ? (
        <Alert tone={currentStatus === 'rejected' ? 'error' : 'info'} title={currentLabel}>
          {isHindi ? null : current.description}
        </Alert>
      ) : (
        <div>
          <p className="font-medium">
            {t('stageOf', {
              current: reachedIndex + 1,
              total: steps.length,
              status: currentLabel,
            })}
          </p>
          {!isHindi && <p className="text-subtle mt-1 text-sm">{current.description}</p>}
          <ol aria-label={t('progressLabel')} className="mt-4 flex gap-1">
            {steps.map((status, index) => {
              const definition = STATUS_DEFINITIONS[status];
              const reached = index <= reachedIndex;
              return (
                <li
                  key={status}
                  aria-current={index === reachedIndex ? 'step' : undefined}
                  className="min-w-0 flex-1"
                >
                  <span
                    aria-hidden
                    className={`block h-1.5 rounded-sm ${reached ? 'bg-sal' : 'bg-line'}`}
                  />
                  <span
                    className={`sr-only sm:not-sr-only sm:mt-2 sm:block sm:text-xs sm:leading-snug ${
                      reached ? 'sm:text-ink sm:font-medium' : 'sm:text-subtle'
                    }`}
                  >
                    {isHindi ? definition.labelHi : definition.labelEn}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <ol>
        {events.map((event, index) => {
          const definition = STATUS_DEFINITIONS[event.toStatus as ProblemStatus];
          const isLast = index === events.length - 1;
          return (
            <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span aria-hidden className="bg-line absolute top-4 left-[6px] h-full w-px" />
              )}
              <span
                aria-hidden
                className="border-sal bg-paper relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2"
              />
              <div className="min-w-0 flex-1">
                {definition ? (
                  <>
                    <p className="font-medium">
                      {isHindi ? definition.labelHi : definition.labelEn}
                    </p>
                    {event.note && <p className="text-subtle mt-0.5 text-sm">{event.note}</p>}
                  </>
                ) : (
                  <p className="font-medium">{event.note ?? event.toStatus}</p>
                )}
                <p className="text-subtle mt-1 text-sm">
                  {formatDate(event.createdAt, isHindi ? 'hi-IN' : 'en-IN')}
                  {event.actorLabel && <span className="block">{event.actorLabel}</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
