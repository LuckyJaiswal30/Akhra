'use client';

import { useActionState } from 'react';
import { ActionFeedback, Button, Input, Textarea, useActionForm } from '@/components/ui';
import { formatDate, label, type Labels } from '@/lib/utils';
import { createMilestoneAction, updateMilestoneAction } from '../actions';
import type { Lifecycle, MilestoneRecord } from '../service';
import { INITIAL_LIFECYCLE_STATE } from '../state';
import { Panel } from './project-panel';

export function MilestonesPanel({
  projectId,
  lifecycle,
  locale,
  labels,
}: {
  projectId: string;
  lifecycle: Lifecycle;
  locale: string;
  labels: Labels;
}) {
  const [state, action, isPending] = useActionState(createMilestoneAction, INITIAL_LIFECYCLE_STATE);
  const form = useActionForm(action, state);
  const canPlan = lifecycle.canManage && !lifecycle.canApprove;

  return (
    <Panel title={label(labels, 'milestones')} hint={label(labels, 'milestonesHint')}>
      {lifecycle.milestones.length === 0 ? (
        <p className="text-subtle text-sm">{label(labels, 'noMilestones')}</p>
      ) : (
        <ol className="space-y-2">
          {lifecycle.milestones.map((milestone) => (
            <MilestoneRow
              key={milestone.id}
              projectId={projectId}
              milestone={milestone}
              locale={locale}
              labels={labels}
            />
          ))}
        </ol>
      )}

      {canPlan && (
        <form {...form} className="border-line mt-5 space-y-3 border-t pt-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="orderIndex" value={lifecycle.milestones.length} />
          <ActionFeedback state={state} />

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              name="title"
              placeholder={label(labels, 'milestoneTitle')}
              maxLength={180}
              required
              className="sm:col-span-2"
            />
            <Input name="dueDate" type="date" aria-label={label(labels, 'dueDate')} />
          </div>
          <Textarea
            name="description"
            rows={2}
            maxLength={2000}
            placeholder={label(labels, 'milestoneDescription')}
          />
          <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
            {label(labels, 'addMilestone')}
          </Button>
        </form>
      )}
    </Panel>
  );
}

function MilestoneRow({
  projectId,
  milestone,
  locale,
  labels,
}: {
  projectId: string;
  milestone: MilestoneRecord;
  locale: string;
  labels: Labels;
}) {
  const [state, action, isPending] = useActionState(updateMilestoneAction, INITIAL_LIFECYCLE_STATE);
  const form = useActionForm(action, state);
  const isHindi = locale === 'hi';

  return (
    <li className="border-line rounded-md border px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{milestone.title}</p>
          {milestone.description && (
            <p className="text-subtle mt-0.5 text-xs">{milestone.description}</p>
          )}
          {milestone.dueDate && (
            <p className="text-subtle mt-0.5 text-xs">
              {label(labels, 'due')} {formatDate(milestone.dueDate, isHindi ? 'hi-IN' : 'en-IN')}
            </p>
          )}
        </div>
        <span className="border-line rounded-full border px-2.5 py-0.5 text-xs">
          {label(labels, `milestoneStatus_${milestone.status}`)}
        </span>
      </div>

      {milestone.nextStatuses.length > 0 && (
        <form {...form} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="milestoneId" value={milestone.id} />
          {milestone.nextStatuses.map((status) => (
            <Button
              key={status}
              type="submit"
              name="status"
              value={status}
              size="sm"
              variant={status === 'rejected' ? 'secondary' : 'ghost'}
              disabled={isPending}
            >
              {label(labels, `milestoneAction_${status}`)}
            </Button>
          ))}
          {state && !state.ok && (
            <span role="alert" className="text-danger text-xs">
              {state.error.message}
            </span>
          )}
        </form>
      )}
    </li>
  );
}
