'use client';

import { useState, type FormEvent } from 'react';
import { PARTNER_KIND_LABELS, PARTNER_KINDS } from '@akhra/shared';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import {
  districtsByName,
  fill,
  InviteLinkNotice,
  useApiSubmit,
  type IssuedInvite,
  type Labels,
} from './access-form-parts';

export function OnboardOrganizationForm({ labels, locale }: { labels: Labels; locale: string }) {
  const { error, isPending, submit, fieldError } = useApiSubmit();
  const [type, setType] = useState<'university' | 'industry'>('university');
  const [done, setDone] = useState<{
    email: string;
    delivery: 'clerk' | 'email';
    link?: string;
  } | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const contactEmail = String(data.get('contactEmail') ?? '');
    submit<IssuedInvite>(
      '/api/v1/admin/organizations',
      {
        name: data.get('name'),
        type,
        ...(type === 'industry' ? { partnerKind: data.get('partnerKind') } : {}),
        agreementReference: data.get('agreementReference'),
        contactEmail,
        ...(data.get('districtCode') ? { districtCode: data.get('districtCode') } : {}),
      },
      (result) => {
        setDone({ email: contactEmail, delivery: result.delivery, link: result.inviteLink });
        form.reset();
        setType('university');
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

      <Field label={labels.orgName!} htmlFor="org-name" error={fieldError('name')} required>
        <Input id="org-name" name="name" maxLength={200} required />
      </Field>
      <div className="grid gap-4">
        <Field label={labels.orgType!} htmlFor="org-type" error={fieldError('type')} required>
          <Select
            id="org-type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            <option value="university">{labels.typeUniversity}</option>
            <option value="industry">{labels.typeIndustry}</option>
          </Select>
        </Field>
        {type === 'industry' && (
          <Field
            label={labels.partnerKind!}
            htmlFor="org-partner-kind"
            hint={labels.partnerKindHint}
            error={fieldError('partnerKind')}
            required
          >
            <Select id="org-partner-kind" name="partnerKind" defaultValue="" required>
              <option value="" disabled>
                {labels.choosePartnerKind}
              </option>
              {PARTNER_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {locale === 'hi' ? PARTNER_KIND_LABELS[kind].hi : PARTNER_KIND_LABELS[kind].en}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={labels.district!} htmlFor="org-district" error={fieldError('districtCode')}>
          <Select id="org-district" name="districtCode" defaultValue="">
            <option value="">{labels.districtNone}</option>
            {districtsByName(locale).map((d) => (
              <option key={d.code} value={d.code}>
                {locale === 'hi' ? d.nameHi : d.nameEn}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label={labels.agreement!}
        htmlFor="org-agreement"
        hint={labels.agreementHint}
        error={fieldError('agreementReference')}
        required
      >
        <Input id="org-agreement" name="agreementReference" maxLength={120} required />
      </Field>
      <Field
        label={labels.contactEmail!}
        htmlFor="org-contact"
        error={fieldError('contactEmail')}
        required
      >
        <Input id="org-contact" name="contactEmail" type="email" autoComplete="off" required />
      </Field>
      <Button type="submit" disabled={isPending}>
        {isPending ? labels.sending : labels.onboard}
      </Button>
    </form>
  );
}
