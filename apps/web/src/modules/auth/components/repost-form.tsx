'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Button, Dialog, Field, Input, Select } from '@/components/ui';
import {
  CARD_ACTION,
  districtsByName,
  fill,
  PersonSummary,
  useApiSubmit,
  type Labels,
  type PersonDetails,
} from './access-form-parts';

export function RepostForm({
  userId,
  person,
  current,
  demotesSuperAdmin = false,
  departments,
  locale,
  labels,
}: {
  userId: string;
  person: PersonDetails;
  current: {
    posting: 'district' | 'state' | 'department';
    jurisdictionCode: string | null;
    organizationId: string | null;
    designation: string | null;
    label: string;
  };
  demotesSuperAdmin?: boolean;
  departments: { value: string; label: string }[];
  locale: string;
  labels: Labels;
}) {
  const { error, isPending, submit, fieldError } = useApiSubmit();
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(current.posting);
  const [district, setDistrict] = useState(current.jurisdictionCode ?? '');
  const [organizationId, setOrganizationId] = useState(current.organizationId ?? '');
  const [designation, setDesignation] = useState(current.designation ?? '');
  const [done, setDone] = useState(false);

  function retarget(next: () => void) {
    if (designation.trim() === (current.designation ?? '').trim()) setDesignation('');
    next();
  }

  function close() {
    setOpen(false);
    setPosting(current.posting);
    setDistrict(current.jurisdictionCode ?? '');
    setOrganizationId(current.organizationId ?? '');
    setDesignation(current.designation ?? '');
  }

  const nextLabel =
    posting === 'state'
      ? labels.scopeState
      : posting === 'district'
        ? (districtsByName(locale).find((d) => d.code === district) &&
            fill(labels.districtOfficer, {
              district:
                locale === 'hi'
                  ? districtsByName(locale).find((d) => d.code === district)!.nameHi
                  : districtsByName(locale).find((d) => d.code === district)!.nameEn,
            })) ||
          labels.selectDistrict
        : (departments.find((d) => d.value === organizationId)?.label ?? labels.selectDepartment);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    submit(
      `/api/v1/admin/users/${userId}/posting`,
      {
        posting,
        reason: data.get('reason'),
        ...(posting === 'district' ? { jurisdictionCode: district } : {}),
        ...(posting === 'department' ? { organizationId } : {}),
        ...(designation.trim() ? { designation: designation.trim() } : {}),
      },
      () => {
        setDone(true);
        setOpen(false);
      },
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={CARD_ACTION}
        onClick={() => setOpen(true)}
      >
        {labels.repost}
      </Button>
      {done && (
        <p role="status" className="text-sal basis-full text-xs font-medium">
          {labels.repostDone}
        </p>
      )}

      {open && (
        <Dialog
          open
          onClose={close}
          title={labels.repostTitle!}
          description={labels.repostSubtitle}
          closeLabel={labels.cancel!}
        >
          <PersonSummary person={person} labels={labels} />

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-subtle">{labels.repostFrom}</dt>
            <dd className="text-ink font-medium">{current.label}</dd>
            <dt className="text-subtle">{labels.repostTo}</dt>
            <dd className="text-sal font-semibold">{nextLabel}</dd>
          </dl>

          <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
            {demotesSuperAdmin && <Alert tone="info">{labels.repostDemotes}</Alert>}
            {error && <Alert tone="error">{error.message}</Alert>}

            <Field
              label={labels.repostPosting!}
              htmlFor={`posting-${userId}`}
              error={fieldError('posting')}
              required
            >
              <Select
                id={`posting-${userId}`}
                value={posting}
                onChange={(event) =>
                  retarget(() => setPosting(event.target.value as typeof posting))
                }
              >
                <option value="district">{labels.scopeDistrict}</option>
                <option value="state">{labels.scopeState}</option>
                <option value="department">{labels.repostDepartment}</option>
              </Select>
            </Field>

            {posting === 'district' && (
              <Field
                label={labels.jurisdiction!}
                htmlFor={`district-${userId}`}
                error={fieldError('jurisdictionCode')}
                required
              >
                <Select
                  id={`district-${userId}`}
                  value={district}
                  onChange={(event) => retarget(() => setDistrict(event.target.value))}
                  required
                >
                  <option value="">{labels.selectDistrict}</option>
                  {districtsByName(locale).map((d) => (
                    <option key={d.code} value={d.code}>
                      {locale === 'hi' ? d.nameHi : d.nameEn}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {posting === 'state' && <Alert tone="info">{labels.scopeStateWarning}</Alert>}
            {posting === 'department' && (
              <Field
                label={labels.department!}
                htmlFor={`dept-${userId}`}
                error={fieldError('organizationId')}
                required
              >
                <Select
                  id={`dept-${userId}`}
                  value={organizationId}
                  onChange={(event) => retarget(() => setOrganizationId(event.target.value))}
                  required
                >
                  <option value="">{labels.selectDepartment}</option>
                  {departments.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label={labels.designation!}
              htmlFor={`designation-${userId}`}
              hint={labels.designationHint}
              error={fieldError('designation')}
            >
              <Input
                id={`designation-${userId}`}
                name="designation"
                maxLength={120}
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
              />
            </Field>

            <Field
              label={labels.repostReason!}
              htmlFor={`reason-${userId}`}
              hint={labels.repostReasonHint}
              error={fieldError('reason')}
              required
            >
              <Input id={`reason-${userId}`} name="reason" maxLength={300} required />
            </Field>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" disabled={isPending}>
                {isPending ? labels.repostSaving : labels.repostSave}
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                {labels.cancel}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
