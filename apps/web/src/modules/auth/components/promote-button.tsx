'use client';

import { useState } from 'react';
import { Alert, Button, Dialog } from '@/components/ui';
import { PersonSummary, useApiSubmit, type Labels, type PersonDetails } from './access-form-parts';

export function PromoteButton({
  userId,
  person,
  postingLabel,
  labels,
}: {
  userId: string;
  person: PersonDetails;
  postingLabel: string;
  labels: Labels;
}) {
  const { error, isPending, submit } = useApiSubmit();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {labels.promote}
      </Button>
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title={labels.promoteTitle!}
          description={labels.promoteSubtitle}
          closeLabel={labels.cancel!}
        >
          <div className="space-y-4">
            <PersonSummary person={person} labels={labels} />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-subtle">{labels.repostFrom}</dt>
              <dd className="text-ink font-medium">{postingLabel}</dd>
              <dt className="text-subtle">{labels.repostTo}</dt>
              <dd className="text-sal font-semibold">{labels.promoteBecomes}</dd>
            </dl>
            <Alert tone="warning" title={labels.promoteWarningTitle}>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>{labels.promotePower1}</li>
                <li>{labels.promotePower2}</li>
                <li>{labels.promotePower3}</li>
              </ul>
            </Alert>
            {error && <Alert tone="error">{error.message}</Alert>}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  submit(`/api/v1/admin/users/${userId}/promote`, {}, () => setOpen(false))
                }
              >
                {isPending ? labels.promoting : labels.promoteConfirmButton}
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
