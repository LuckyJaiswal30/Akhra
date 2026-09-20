'use client';

import { useActionState } from 'react';
import {
  ACADEMIC_DISCIPLINES,
  DISCIPLINE_LABELS,
  DOMAIN_DEFINITIONS,
  DOMAINS,
  EXPERTISE_STRENGTHS,
  FACILITY_LABELS,
  INSTITUTION_FACILITIES,
} from '@akhra/shared';
import { ActionFeedback, Button, Field, Select, Textarea, useActionForm } from '@/components/ui';
import { label, type Labels } from '@/lib/utils';
import { updateInstitutionProfileAction } from '../actions';
import type { InstitutionProfile } from '../profile';
import { INITIAL_UNIVERSITY_STATE } from '../state';

const CHIP =
  'border-line text-ink has-checked:border-sal has-checked:bg-sal-wash has-focus-visible:ring-sal/30 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border px-4 text-sm has-focus-visible:ring-4';

export function InstitutionProfileForm({
  profile,
  canEdit,
  locale,
  labels,
}: {
  profile: InstitutionProfile;
  canEdit: boolean;
  locale: string;
  labels: Labels;
}) {
  const [state, action, isPending] = useActionState(
    updateInstitutionProfileAction,
    INITIAL_UNIVERSITY_STATE,
  );
  const form = useActionForm(action, state);
  const isHindi = locale === 'hi';
  const strengthOf = new Map(profile.domains.map((row) => [row.domain, row.strength]));

  return (
    <form {...form} className="space-y-8">
      <ActionFeedback state={state} />
      <fieldset disabled={!canEdit} className="space-y-8">
        <Field
          label={label(labels, 'description')}
          htmlFor="profile-description"
          hint={label(labels, 'descriptionHint')}
        >
          <Textarea
            id="profile-description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={profile.description}
          />
        </Field>

        <section className="space-y-3">
          <div>
            <h2 className="font-medium">{label(labels, 'areasTitle')}</h2>
            <p className="text-subtle mt-0.5 text-sm">{label(labels, 'areasHint')}</p>
          </div>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            {DOMAINS.map((domain) => (
              <Field
                key={domain}
                label={
                  isHindi ? DOMAIN_DEFINITIONS[domain].labelHi : DOMAIN_DEFINITIONS[domain].labelEn
                }
                htmlFor={`strength-${domain}`}
              >
                <Select
                  id={`strength-${domain}`}
                  name={`strength_${domain}`}
                  defaultValue={String(strengthOf.get(domain) ?? 0)}
                >
                  <option value="0">{label(labels, 'strength_0')}</option>
                  {EXPERTISE_STRENGTHS.map((strength) => (
                    <option key={strength} value={strength}>
                      {label(labels, `strength_${strength}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
        </section>

        <ChipGroup
          title={label(labels, 'disciplinesTitle')}
          hint={label(labels, 'disciplinesHint')}
        >
          {ACADEMIC_DISCIPLINES.map((discipline) => (
            <label key={discipline} className={CHIP}>
              <input
                type="checkbox"
                name={`discipline_${discipline}`}
                defaultChecked={profile.disciplines.includes(discipline)}
                className="accent-sal h-4 w-4"
              />
              {isHindi ? DISCIPLINE_LABELS[discipline].hi : DISCIPLINE_LABELS[discipline].en}
            </label>
          ))}
        </ChipGroup>

        <ChipGroup title={label(labels, 'facilitiesTitle')} hint={label(labels, 'facilitiesHint')}>
          {INSTITUTION_FACILITIES.map((facility) => (
            <label key={facility} className={CHIP}>
              <input
                type="checkbox"
                name={`facility_${facility}`}
                defaultChecked={profile.facilities.includes(facility)}
                className="accent-sal h-4 w-4"
              />
              {isHindi ? FACILITY_LABELS[facility].hi : FACILITY_LABELS[facility].en}
            </label>
          ))}
        </ChipGroup>
      </fieldset>

      {canEdit && (
        <Button type="submit" disabled={isPending}>
          {isPending ? label(labels, 'saving') : label(labels, 'save')}
        </Button>
      )}
    </form>
  );
}

function ChipGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-subtle mt-0.5 text-sm">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
