'use client';

import { useActionState, useState } from 'react';
import { CircleCheck, RotateCcw } from 'lucide-react';
import { ActionFeedback, Button, Field, Input, Textarea, useActionForm } from '@/components/ui';
import { reporterDecisionAction, type AdminActionState } from '../actions';

const INITIAL: AdminActionState = null;

export function ReporterDecision({
  refCode,
  actionTakenNote,
  needsPhone,
  labels,
}: {
  refCode: string;
  actionTakenNote: string | null;
  needsPhone: boolean;
  labels: Record<string, string>;
}) {
  const [state, action, isPending] = useActionState(reporterDecisionAction, INITIAL);
  const form = useActionForm(action, state);
  const [decision, setDecision] = useState<'confirm' | 'reopen' | null>(null);

  if (state?.ok) {
    return (
      <div className="border-sal/30 bg-sal-wash rounded-xl border p-4 text-sm">
        <ActionFeedback state={state} />
      </div>
    );
  }

  return (
    <div className="border-line rounded-xl border p-4 sm:p-5">
      <h3 className="font-medium">{labels.decisionTitle}</h3>
      {actionTakenNote && (
        <p className="text-subtle mt-2 text-sm whitespace-pre-line">{actionTakenNote}</p>
      )}
      <p className="text-subtle mt-3 text-sm">{labels.decisionHint}</p>

      <form {...form} className="mt-4 space-y-3">
        <input type="hidden" name="refCode" value={refCode} />
        <input type="hidden" name="decision" value={decision ?? 'confirm'} />
        <ActionFeedback state={state} />

        {needsPhone && (
          <Field label={labels.phoneLast4!} htmlFor="reporter-phone" hint={labels.phoneLast4Hint}>
            <Input
              id="reporter-phone"
              name="phoneLast4"
              inputMode="numeric"
              maxLength={4}
              required
            />
          </Field>
        )}

        {decision === 'reopen' && (
          <Field label={labels.reopenReason!} htmlFor="reporter-note">
            <Textarea
              id="reporter-note"
              name="note"
              rows={3}
              placeholder={labels.reopenPlaceholder}
              maxLength={1000}
              required
            />
          </Field>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            disabled={isPending}
            onClick={() => setDecision('confirm')}
            className="sm:flex-1"
          >
            <CircleCheck aria-hidden className="h-4 w-4" />
            {isPending && decision === 'confirm' ? labels.saving : labels.confirmFixed}
          </Button>
          <Button
            type={decision === 'reopen' ? 'submit' : 'button'}
            variant="secondary"
            disabled={isPending}
            onClick={() => setDecision('reopen')}
            className="sm:flex-1"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            {isPending && decision === 'reopen' ? labels.saving : labels.notFixed}
          </Button>
        </div>
      </form>
    </div>
  );
}
