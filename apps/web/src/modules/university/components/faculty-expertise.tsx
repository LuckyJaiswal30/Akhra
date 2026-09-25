'use client';

import { useActionState, useEffect, useState } from 'react';
import { ACADEMIC_DISCIPLINES, DISCIPLINE_LABELS, type AcademicDiscipline } from '@akhra/shared';
import {
  ActionFeedback,
  Button,
  Dialog,
  Field,
  Input,
  Select,
  fieldError,
  useActionForm,
} from '@/components/ui';
import { label, type Labels } from '@/lib/utils';
import { setFacultyExpertiseAction } from '../actions';
import type { FacultyExpertise } from '../profile';
import { INITIAL_UNIVERSITY_STATE } from '../state';

function disciplineName(discipline: AcademicDiscipline | null, locale: string): string | null {
  if (!discipline) return null;
  return locale === 'hi' ? DISCIPLINE_LABELS[discipline].hi : DISCIPLINE_LABELS[discipline].en;
}

export function FacultyExpertiseList({
  faculty,
  canEdit,
  locale,
  labels,
}: {
  faculty: FacultyExpertise[];
  canEdit: boolean;
  locale: string;
  labels: Labels;
}) {
  return (
    <ul className="divide-line border-line divide-y border-y">
      {faculty.map((person) => (
        <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{person.name ?? person.email}</p>
            <p className="text-subtle text-xs">
              {[disciplineName(person.discipline, locale), person.specialisation]
                .filter(Boolean)
                .join(' · ') || label(labels, 'noDiscipline')}
            </p>
          </div>
          {canEdit && <ExpertiseDialog person={person} locale={locale} labels={labels} />}
        </li>
      ))}
    </ul>
  );
}

function ExpertiseDialog({
  person,
  locale,
  labels,
}: {
  person: FacultyExpertise;
  locale: string;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    setFacultyExpertiseAction,
    INITIAL_UNIVERSITY_STATE,
  );
  const form = useActionForm(action, state);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {label(labels, person.discipline ? 'changeDiscipline' : 'setDiscipline')}
      </Button>
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title={label(labels, 'disciplineDialogTitle')}
          description={person.name ?? person.email}
          closeLabel={label(labels, 'cancel')}
        >
          <form {...form} className="space-y-4">
            <input type="hidden" name="userId" value={person.id} />
            <ActionFeedback state={state} />
            <Field
              label={label(labels, 'discipline')}
              htmlFor={`discipline-${person.id}`}
              error={fieldError(state, 'discipline')}
              required
            >
              <Select
                id={`discipline-${person.id}`}
                name="discipline"
                defaultValue={person.discipline ?? ''}
                required
              >
                <option value="" disabled>
                  {label(labels, 'chooseDiscipline')}
                </option>
                {ACADEMIC_DISCIPLINES.map((discipline) => (
                  <option key={discipline} value={discipline}>
                    {disciplineName(discipline, locale)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={label(labels, 'specialisation')}
              htmlFor={`specialisation-${person.id}`}
              hint={label(labels, 'specialisationHint')}
            >
              <Input
                id={`specialisation-${person.id}`}
                name="specialisation"
                maxLength={160}
                defaultValue={person.specialisation ?? ''}
              />
            </Field>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" disabled={isPending}>
                {isPending ? label(labels, 'saving') : label(labels, 'save')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {label(labels, 'cancel')}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
