'use client';

import { useActionState } from 'react';
import { ActionFeedback, Button, Textarea, useActionForm } from '@/components/ui';
import { label, type Labels } from '@/lib/utils';
import { advanceProjectAction } from '../actions';
import type { Lifecycle } from '../service';
import { INITIAL_LIFECYCLE_STATE } from '../state';
import { Panel, statusLabel } from './project-panel';

export function StagePanel({
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
  const [state, action, isPending] = useActionState(advanceProjectAction, INITIAL_LIFECYCLE_STATE);
  const form = useActionForm(action, state);

  return (
    <Panel title={label(labels, 'stage')} hint={label(labels, 'stageHint')}>
      <p className="text-sm">
        {label(labels, 'currentStage')}:{' '}
        <span className="font-medium">{statusLabel(lifecycle.status, locale)}</span>
      </p>

      {/* A panel whose only content is the stage it is already on reads as broken. Say why there
          is nothing to press: the work is finished, or it is not this account's to move. */}
      {lifecycle.nextStatuses.length === 0 && (
        <p className="text-subtle mt-2 text-sm">
          {label(
            labels,
            lifecycle.status === 'closed'
              ? 'stageClosed'
              : lifecycle.canManage
                ? 'stageFinal'
                : 'stageNotYours',
          )}
        </p>
      )}

      {lifecycle.nextStatuses.length > 0 && (
        <form {...form} className="mt-4 space-y-3">
          <input type="hidden" name="projectId" value={projectId} />
          <ActionFeedback state={state} />

          <Textarea
            name="note"
            rows={2}
            maxLength={1000}
            placeholder={label(labels, 'stageNote')}
          />
          <div className="flex flex-wrap gap-2">
            {lifecycle.nextStatuses.map((status) => (
              <Button
                key={status}
                type="submit"
                name="toStatus"
                value={status}
                size="sm"
                variant={status === 'on_hold' ? 'secondary' : 'primary'}
                disabled={isPending}
              >
                {label(labels, 'moveTo')} {statusLabel(status, locale)}
              </Button>
            ))}
          </div>
        </form>
      )}
    </Panel>
  );
}
