'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  districtsByName,
  fill,
  InviteLinkNotice,
  useApiSubmit,
  type IssuedInvite,
  type Labels,
} from './access-form-parts';

export function InviteForm({
  roles,
  organizationId,
  organizations,
  districts,
  labels,
  locale,
}: {
  roles: { value: string; label: string }[];
  organizationId?: string;
  organizations?: { value: string; label: string }[];
  /** Present only for the district-officer invite, which must choose a posting. */
  districts?: boolean;
  labels: Labels;
  locale?: string;
}) {
  const { error, isPending, submit, fieldError } = useApiSubmit();
  const [scope, setScope] = useState<'' | 'district' | 'state'>('');
  const [done, setDone] = useState<{
    email: string;
    delivery: 'clerk' | 'email';
    link?: string;
  } | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '');
    submit<IssuedInvite>(
      '/api/v1/invites',
      {
        email,
        role: data.get('role'),
        ...(organizationId ? { organizationId } : {}),
        ...(data.get('organizationId') ? { organizationId: data.get('organizationId') } : {}),
        ...(data.get('scope') ? { scope: data.get('scope') } : {}),
        ...(data.get('jurisdictionCode') ? { jurisdictionCode: data.get('jurisdictionCode') } : {}),
        ...(data.get('designation') ? { designation: data.get('designation') } : {}),
      },
      (result) => {
        setDone({ email, delivery: result.delivery, link: result.inviteLink });
        form.reset();
        setScope('');
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="error">{error.message}</Alert>}
      {done && (
        <Alert tone="success">
          {fill(done.delivery === 'email' ? labels.sentEmail : labels.sentClerk, {
            email: done.email,
          })}
        </Alert>
      )}
      {done?.link && <InviteLinkNotice link={done.link} labels={labels} />}

      {/* With a single role there is no second column, so the email field takes the full width
          rather than stopping two thirds of the way across beside an empty gap. */}
      <div
        className={cn(
          'grid gap-4',
          roles.length > 1 && 'sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]',
        )}
      >
        <Field label={labels.email!} htmlFor="invite-email" error={fieldError('email')} required>
          <Input id="invite-email" name="email" type="email" autoComplete="off" required />
        </Field>
        {roles.length > 1 ? (
          <Field label={labels.role!} htmlFor="invite-role" error={fieldError('role')}>
            <Select id="invite-role" name="role" defaultValue={roles[0]?.value}>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="role" value={roles[0]?.value} />
        )}
      </div>
      {organizations && (
        <Field
          label={labels.department!}
          htmlFor="invite-organization"
          error={fieldError('organizationId')}
          required
        >
          <Select id="invite-organization" name="organizationId" defaultValue="" required>
            <option value="">{labels.selectDepartment}</option>
            {organizations.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {districts && (
        <>
          <Field
            label={labels.scope!}
            htmlFor="invite-scope"
            hint={labels.scopeHint}
            error={fieldError('scope')}
            required
          >
            <Select
              id="invite-scope"
              name="scope"
              value={scope}
              onChange={(event) => setScope(event.target.value as typeof scope)}
              required
            >
              <option value="">{labels.scopeChoose}</option>
              <option value="district">{labels.scopeDistrict}</option>
              <option value="state">{labels.scopeState}</option>
            </Select>
          </Field>
          {scope === 'district' && (
            <Field
              label={labels.jurisdiction!}
              htmlFor="invite-jurisdiction"
              error={fieldError('jurisdictionCode')}
              required
            >
              <Select id="invite-jurisdiction" name="jurisdictionCode" defaultValue="" required>
                <option value="">{labels.selectDistrict}</option>
                {districtsByName(locale).map((district) => (
                  <option key={district.code} value={district.code}>
                    {locale === 'hi' ? district.nameHi : district.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {scope === 'state' && <Alert tone="info">{labels.scopeStateWarning}</Alert>}
        </>
      )}
      {(districts || organizations) && (
        <Field
          label={labels.designation!}
          htmlFor="invite-designation"
          hint={districts ? labels.designationHint : labels.designationHintDept}
          error={fieldError('designation')}
        >
          <Input id="invite-designation" name="designation" maxLength={120} />
        </Field>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? labels.sending : labels.invite}
      </Button>
    </form>
  );
}

export function RevokeInviteButton({ inviteId, label }: { inviteId: string; label: string }) {
  const { error, isPending, submit } = useApiSubmit();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => submit(`/api/v1/invites/${inviteId}/revoke`, {}, () => undefined)}
      >
        {label}
      </Button>
      {error && (
        <span role="alert" className="text-danger text-xs">
          {error.message}
        </span>
      )}
    </span>
  );
}
