'use client';

import { useActionState, useState } from 'react';
import { IP_STATUSES, OUTCOME_TYPES, type OutcomeType } from '@akhra/shared';
import {
  ActionFeedback,
  Button,
  Field,
  fieldError,
  Input,
  Select,
  Textarea,
  useActionForm,
} from '@/components/ui';
import { label, type Labels } from '@/lib/utils';
import { recordOutcomeAction } from '../actions';
import type { Lifecycle } from '../service';
import { INITIAL_LIFECYCLE_STATE } from '../state';
import { Panel } from './project-panel';

export function OutcomesPanel({
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
  const [state, action, isPending] = useActionState(recordOutcomeAction, INITIAL_LIFECYCLE_STATE);
  const form = useActionForm(action, state);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<OutcomeType>('deployment');
  const isHindi = locale === 'hi';

  return (
    <Panel title={label(labels, 'outcomes')} hint={label(labels, 'outcomesHint')}>
      {lifecycle.outcomes.length === 0 ? (
        <p className="text-subtle text-sm">{label(labels, 'noOutcomes')}</p>
      ) : (
        <ul className="space-y-2">
          {lifecycle.outcomes.map((outcome) => (
            <li key={outcome.id} className="border-line rounded-md border px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-sal/15 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {label(labels, `outcomeType_${outcome.outcomeType}`)}
                </span>
                {outcome.ipStatus && (
                  <span className="border-line rounded-full border px-2.5 py-0.5 text-xs">
                    {label(labels, `ipStatus_${outcome.ipStatus}`)}
                  </span>
                )}
                <span className="text-sm font-medium">{outcome.title}</span>
              </div>
              {outcome.detail && <p className="text-subtle mt-1 text-sm">{outcome.detail}</p>}
              {outcome.reference && (
                <p className="text-subtle mt-1 text-xs">
                  {label(labels, 'reference')}:{' '}
                  <span className="font-mono">{outcome.reference}</span>
                </p>
              )}
              {outcome.impactMetricName && outcome.impactMetricValue && (
                <p className="mt-1 text-xs">
                  {outcome.impactMetricName}:{' '}
                  <span className="font-medium tabular-nums">
                    {Number(outcome.impactMetricValue).toLocaleString(isHindi ? 'hi-IN' : 'en-IN')}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {lifecycle.canManage &&
        (open ? (
          <form {...form} className="border-line mt-5 space-y-4 border-t pt-4">
            <input type="hidden" name="projectId" value={projectId} />
            <ActionFeedback state={state} />

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Field label={label(labels, 'outcomeTypeLabel')} htmlFor="outcome-type" required>
                <Select
                  id="outcome-type"
                  name="outcomeType"
                  value={type}
                  onChange={(event) => setType(event.target.value as OutcomeType)}
                >
                  {OUTCOME_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {label(labels, `outcomeType_${option}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={label(labels, 'outcomeTitle')}
                htmlFor="outcome-title"
                error={fieldError(state, 'title')}
                required
              >
                <Input id="outcome-title" name="title" maxLength={200} required />
              </Field>
            </div>

            {type === 'patent' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={label(labels, 'ipStatusLabel')}
                  htmlFor="outcome-ip-status"
                  error={fieldError(state, 'ipStatus')}
                  required
                >
                  <Select id="outcome-ip-status" name="ipStatus" defaultValue="filed">
                    {IP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {label(labels, `ipStatus_${status}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label={label(labels, 'patentReference')}
                  htmlFor="outcome-reference"
                  hint={label(labels, 'patentReferenceHint')}
                >
                  <Input id="outcome-reference" name="reference" maxLength={120} />
                </Field>
              </div>
            )}

            <Field label={label(labels, 'outcomeDetail')} htmlFor="outcome-detail">
              <Textarea id="outcome-detail" name="detail" rows={2} maxLength={3000} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={label(labels, 'metricName')} htmlFor="outcome-metric-name">
                <Input id="outcome-metric-name" name="impactMetricName" maxLength={120} />
              </Field>
              <Field label={label(labels, 'metricValue')} htmlFor="outcome-metric-value">
                <Input
                  id="outcome-metric-value"
                  name="impactMetricValue"
                  type="number"
                  step="any"
                />
              </Field>
              <Field
                label={label(labels, 'evidenceUrl')}
                htmlFor="outcome-evidence"
                error={fieldError(state, 'evidenceUrl')}
              >
                <Input id="outcome-evidence" name="evidenceUrl" type="url" />
              </Field>
            </div>
            {type !== 'patent' && (
              <Field
                label={label(labels, 'reference')}
                htmlFor="outcome-reference"
                hint={label(labels, 'referenceHint')}
              >
                <Input id="outcome-reference" name="reference" maxLength={120} />
              </Field>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {label(labels, 'recordOutcome')}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
                {label(labels, 'cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-4"
            onClick={() => setOpen(true)}
          >
            {label(labels, 'recordOutcome')}
          </Button>
        ))}
    </Panel>
  );
}
