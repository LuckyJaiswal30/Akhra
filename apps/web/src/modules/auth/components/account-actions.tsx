'use client';

import { useState } from 'react';
import { Alert, Button, Dialog, Field, Input } from '@/components/ui';
import { fill, useApiSubmit, type Labels } from './access-form-parts';

export function SuspendButton({
  userId,
  name,
  unreviewedReports,
  keptReports,
  labels,
}: {
  userId: string;
  name: string;
  unreviewedReports: number;
  keptReports: number;
  labels: Labels;
}) {
  const { error, isPending, submit } = useApiSubmit();
  const [open, setOpen] = useState(false);
  const [removeReports, setRemoveReports] = useState(true);
  const [reason, setReason] = useState('');
  const removing = removeReports && unreviewedReports > 0;

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {labels.suspend}
      </Button>
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title={fill(labels.suspendTitle, { name })}
          description={labels.suspendBody}
          closeLabel={labels.cancel!}
        >
          <div className="space-y-4">
            {unreviewedReports > 0 && (
              <label className="border-line flex items-start gap-3 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  className="accent-sal mt-0.5 h-5 w-5 shrink-0"
                  checked={removeReports}
                  onChange={(event) => setRemoveReports(event.target.checked)}
                />
                <span>
                  <span className="block font-medium">
                    {fill(labels.suspendRemove, { count: String(unreviewedReports) })}
                  </span>
                  <span className="text-subtle block">{labels.suspendRemoveHint}</span>
                </span>
              </label>
            )}
            {keptReports > 0 && (
              <Alert tone="warning">
                {fill(labels.suspendKept, { count: String(keptReports) })}
              </Alert>
            )}
            <Field label={labels.suspendReason!} htmlFor={`reason-${userId}`}>
              <Input
                id={`reason-${userId}`}
                value={reason}
                maxLength={300}
                placeholder={labels.suspendReasonPlaceholder}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            {error && <Alert tone="error">{error.message}</Alert>}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  submit(
                    `/api/v1/admin/users/${userId}/suspend`,
                    { reason: reason || undefined, removeReports },
                    () => setOpen(false),
                  )
                }
              >
                {isPending
                  ? labels.saving
                  : removing
                    ? fill(labels.suspendAndRemove, { count: String(unreviewedReports) })
                    : labels.suspendConfirm}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {labels.cancel}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

export function ReactivateButton({
  userId,
  name,
  removedReports,
  labels,
}: {
  userId: string;
  name: string;
  removedReports: number;
  labels: Labels;
}) {
  const { error, isPending, submit } = useApiSubmit();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {labels.reactivate}
      </Button>
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title={fill(labels.reactivateTitle, { name })}
          description={labels.reactivateBody}
          closeLabel={labels.cancel!}
        >
          <div className="space-y-4">
            <p className="text-subtle text-sm">
              {removedReports > 0
                ? fill(labels.reactivateNoticeRemoved, { count: String(removedReports) })
                : labels.reactivateNotice}
            </p>
            {error && <Alert tone="error">{error.message}</Alert>}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  submit(`/api/v1/admin/users/${userId}/reactivate`, {}, () => setOpen(false))
                }
              >
                {isPending ? labels.saving : labels.reactivateConfirm}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {labels.cancel}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
