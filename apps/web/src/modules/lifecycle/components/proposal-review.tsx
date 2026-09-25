'use client';

import { useActionState, useState } from 'react';
import { PROPOSAL_DECISIONS, type ProposalDecision } from '@akhra/shared';
import {
  ActionFeedback,
  Button,
  Field,
  Select,
  Textarea,
  fieldError,
  useActionForm,
} from '@/components/ui';
import { label, type Labels } from '@/lib/utils';
import { reviewProposalAction } from '../actions';
import { INITIAL_LIFECYCLE_STATE } from '../state';
import { useDeciding } from './review-queue';

export function ProposalReviewForm({
  projectId,
  proposalId,
  labels,
}: {
  projectId: string;
  proposalId: string;
  labels: Labels;
}) {
  const [state, action, isPending] = useActionState(reviewProposalAction, INITIAL_LIFECYCLE_STATE);
  const deciding = useDeciding(proposalId);
  const form = useActionForm(action, state, deciding);
  const [decision, setDecision] = useState<ProposalDecision>('approved');
  const needsNote = decision !== 'approved';

  return (
    <form {...form} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="proposalId" value={proposalId} />
      <ActionFeedback state={state} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field label={label(labels, 'decision')} htmlFor={`decision-${proposalId}`} required>
          <Select
            id={`decision-${proposalId}`}
            name="decision"
            value={decision}
            onChange={(event) => setDecision(event.target.value as ProposalDecision)}
          >
            {PROPOSAL_DECISIONS.map((option) => (
              <option key={option} value={option}>
                {label(labels, `decision_${option}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={label(labels, needsNote ? 'noteRequired' : 'noteOptional')}
          htmlFor={`note-${proposalId}`}
          error={fieldError(state, 'note')}
          required={needsNote}
        >
          <Textarea
            id={`note-${proposalId}`}
            name="note"
            rows={3}
            maxLength={2000}
            placeholder={label(labels, `notePlaceholder_${decision}`)}
            required={needsNote}
          />
        </Field>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? label(labels, 'saving') : label(labels, `submit_${decision}`)}
      </Button>
    </form>
  );
}
