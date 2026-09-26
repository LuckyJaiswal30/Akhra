'use client';

import dynamic from 'next/dynamic';
import { useActionState, useEffect, useState } from 'react';
import {
  DOMAIN_DEFINITIONS,
  AFFECTED_SCALES,
  DOMAIN_LIST,
  JHARKHAND_DISTRICTS,
  SUBMITTER_TYPES,
  type Domain,
} from '@akhra/shared';
import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  buttonVariants,
  fieldError,
  useActionForm,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { useOnlineStatus } from '@/lib/use-online-status';
import { submitProblemAction, type SubmitState } from '../actions';
import type { SubmissionResult } from '../service';
import { clearDraft, draftFromForm, loadDraft, parseLocation, saveDraft } from '../draft';
import type { ReporterProfile } from '../queries';
import { AttachmentPicker, type AttachmentPickerLabels } from './attachment-picker';
import { VoiceInput } from './voice-input';

const DistrictMap = dynamic(() => import('./district-map').then((m) => m.DistrictMap), {
  ssr: false,
  loading: () => <div className="bg-well h-64 w-full animate-pulse rounded-md" />,
});

const INITIAL: SubmitState = null;
const STEPS = ['problem', 'location', 'contact'] as const;
type Step = (typeof STEPS)[number];
const STEP_FIELDS: Record<Step, string[]> = {
  problem: ['title', 'description', 'domain', 'affectedScale', 'safetyRisk'],
  location: ['districtCode', 'blockName', 'location', 'attachmentIds'],
  contact: [
    'submitterType',
    'submitterName',
    'submitterPhone',
    'submitterEmail',
    'submitterOrganization',
    'consentToPublish',
  ],
};

export interface SubmitFormLabels {
  [key: string]: string;
}

export function SubmitForm({
  labels,
  locale,
  maxUploadBytes,
  pickerLabels,
  profile = null,
}: {
  labels: SubmitFormLabels;
  locale: string;
  maxUploadBytes: number;
  pickerLabels: AttachmentPickerLabels;
  profile?: ReporterProfile | null;
}) {
  const [state, formAction, isPending] = useActionState(submitProblemAction, INITIAL);
  const form = useActionForm(formAction, state);
  const [step, setStep] = useState<Step>('problem');
  const [districtCode, setDistrictCode] = useState(profile?.districtCode ?? '');
  const knowsContact = Boolean(profile?.name && profile.phone);
  const [editingContact, setEditingContact] = useState(!knowsContact);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const isHindi = locale === 'hi';
  const online = useOnlineStatus();
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    const element = form.ref.current;
    if (!draft || !element) return;
    for (const [name, value] of Object.entries(draft)) {
      if (name === 'districtCode') setDistrictCode(value);
      else if (name === 'location') setLocation(parseLocation(value));
      else {
        const input = element.elements.namedItem(name);
        if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = true;
        else if (
          input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement ||
          input instanceof HTMLSelectElement
        ) {
          if (!input.value) input.value = value;
        }
      }
    }
    setHasDraft(true);
  }, [form.ref]);

  useEffect(() => {
    if (form.ref.current && location) saveDraft(draftFromForm(form.ref.current));
  }, [form.ref, location, districtCode]);

  useEffect(() => {
    if (state?.ok) clearDraft();
  }, [state]);

  function rememberDraft() {
    if (!form.ref.current) return;
    saveDraft(draftFromForm(form.ref.current));
    setHasDraft(true);
  }

  function discardDraft() {
    clearDraft();
    form.ref.current?.reset();
    setDistrictCode(profile?.districtCode ?? '');
    setLocation(null);
    setHasDraft(false);
  }

  function appendToDescription(text: string) {
    const field = form.ref.current?.elements.namedItem('description');
    if (!(field instanceof HTMLTextAreaElement)) return;
    field.value = field.value ? `${field.value} ${text}` : text;
    rememberDraft();
  }

  useEffect(() => {
    const fields = state && !state.ok ? Object.keys(state.error.details?.fields ?? {}) : [];
    const firstStepWithError = STEPS.find((name) =>
      STEP_FIELDS[name].some((field) => fields.includes(field)),
    );
    if (firstStepWithError) setStep(firstStepWithError);
  }, [state]);

  if (state?.ok && state.data) {
    return <SubmissionReceipt result={state.data} labels={labels} locale={locale} />;
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <form {...form} onInput={rememberDraft} className="space-y-6" noValidate>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <input type="hidden" name="locale" value={locale} />
      <div>
        <p className="text-ink font-medium" aria-live="polite">
          {labels[`stepOf_${step}`]}
        </p>
        <ol className="mt-2 grid grid-cols-3 gap-1" aria-label={labels.stepsLabel}>
          {STEPS.map((name, index) => (
            <li key={name} aria-current={step === name ? 'step' : undefined}>
              <span
                aria-hidden
                className={`block h-1.5 rounded-sm ${index <= stepIndex ? 'bg-sal' : 'bg-line'}`}
              />
              <span className="sr-only">{labels[`step_${name}`]}</span>
            </li>
          ))}
        </ol>
      </div>

      {!online && <Alert tone="warning">{labels.offline}</Alert>}
      {hasDraft && (
        <p className="text-subtle flex flex-wrap items-center gap-x-3 text-sm" aria-live="polite">
          {labels.draftSaved}
          <button type="button" onClick={discardDraft} className="text-sal font-medium underline">
            {labels.draftDiscard}
          </button>
        </p>
      )}
      {state && !state.ok && <Alert tone="error">{state.error.message}</Alert>}

      <div className={step === 'problem' ? 'space-y-5' : 'hidden'}>
        <Field
          label={labels.title!}
          htmlFor="title"
          hint={labels.titleHint}
          error={fieldError(state, 'title')}
          required
        >
          <Input id="title" name="title" maxLength={180} required />
        </Field>

        <Field
          label={labels.description!}
          htmlFor="description"
          hint={labels.descriptionHint}
          error={fieldError(state, 'description')}
          required
        >
          <Textarea id="description" name="description" rows={7} maxLength={5000} required />
          <VoiceInput
            locale={locale}
            onText={appendToDescription}
            labels={{
              start: labels.voiceStart!,
              stop: labels.voiceStop!,
              hint: labels.voiceHint!,
              language: labels.voiceLanguage!,
            }}
          />
        </Field>

        <Field
          label={labels.domain!}
          htmlFor="domain"
          hint={labels.domainHint}
          error={fieldError(state, 'domain')}
        >
          <Select id="domain" name="domain" defaultValue="">
            <option value="">{labels.domainAuto}</option>
            {DOMAIN_LIST.map((d) => (
              <option key={d.id} value={d.id}>
                {isHindi ? d.labelHi : d.labelEn}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={labels.affectedScale!}
          htmlFor="affectedScale"
          hint={labels.affectedScaleHint}
          error={fieldError(state, 'affectedScale')}
        >
          <Select id="affectedScale" name="affectedScale" defaultValue="">
            <option value="">{labels.affectedScaleUnsure}</option>
            {AFFECTED_SCALES.map((scale) => (
              <option key={scale} value={scale}>
                {labels[`affectedScale_${scale}`]}
              </option>
            ))}
          </Select>
        </Field>

        <label className="border-line has-checked:border-warning has-checked:bg-warning-wash flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <input type="checkbox" name="safetyRisk" className="accent-sal mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="text-ink block text-sm font-medium">{labels.safetyRisk}</span>
            <span className="text-subtle mt-0.5 block text-sm">{labels.safetyRiskHint}</span>
          </span>
        </label>
      </div>

      <div className={step === 'location' ? 'space-y-5' : 'hidden'}>
        <Field
          label={labels.district!}
          htmlFor="districtCode"
          error={fieldError(state, 'districtCode')}
          required
        >
          <Select
            id="districtCode"
            name="districtCode"
            value={districtCode}
            onChange={(e) => setDistrictCode(e.target.value)}
            required
          >
            <option value="">{labels.districtPlaceholder}</option>
            {JHARKHAND_DISTRICTS.map((d) => (
              <option key={d.code} value={d.code}>
                {isHindi ? d.nameHi : d.nameEn}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={labels.block!}
          htmlFor="blockName"
          hint={labels.blockHint}
          error={fieldError(state, 'blockName')}
        >
          <Input
            id="blockName"
            name="blockName"
            maxLength={120}
            defaultValue={profile?.locality ?? undefined}
          />
        </Field>

        <DistrictMap
          districtCode={districtCode || null}
          value={location}
          onChange={setLocation}
          label={labels.mapLabel!}
          hint={labels.mapHint!}
        />
        <input type="hidden" name="location" value={location ? JSON.stringify(location) : ''} />

        <AttachmentPicker
          label={labels.attachments!}
          hint={labels.attachmentsHint!}
          labels={pickerLabels}
          maxBytes={maxUploadBytes}
          onChange={setAttachmentIds}
        />
        {attachmentIds.map((id) => (
          <input key={id} type="hidden" name="attachmentIds" value={id} />
        ))}
      </div>

      <div className={step === 'contact' ? 'space-y-5' : 'hidden'}>
        {knowsContact &&
          !editingContact &&
          !['submitterName', 'submitterPhone', 'submitterEmail'].some((f) =>
            fieldError(state, f),
          ) && (
            <div className="border-line bg-mint flex items-start justify-between gap-4 rounded-xl border p-4">
              <div className="min-w-0 text-sm">
                <p className="text-ink font-medium">{labels.reportingAs}</p>
                <p className="text-ink mt-1 truncate">{profile?.name}</p>
                <p className="text-subtle truncate">{profile?.phone}</p>
                {profile?.email && <p className="text-subtle truncate">{profile.email}</p>}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingContact(true)}
              >
                {labels.editDetails}
              </Button>
            </div>
          )}
        {!knowsContact && profile && <p className="text-subtle text-sm">{labels.profileNote}</p>}
        <div
          className={
            knowsContact &&
            !editingContact &&
            !['submitterName', 'submitterPhone', 'submitterEmail'].some((f) => fieldError(state, f))
              ? 'hidden'
              : 'space-y-5'
          }
        >
          <Field
            label={labels.submitterType!}
            htmlFor="submitterType"
            error={fieldError(state, 'submitterType')}
          >
            <Select id="submitterType" name="submitterType" defaultValue="individual">
              {SUBMITTER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {labels[`submitterType_${type}`]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={labels.name!}
            htmlFor="submitterName"
            error={fieldError(state, 'submitterName')}
            required
          >
            <Input
              id="submitterName"
              name="submitterName"
              autoComplete="name"
              defaultValue={profile?.name ?? undefined}
              required
            />
          </Field>

          <Field
            label={labels.phone!}
            htmlFor="submitterPhone"
            hint={labels.phoneHint}
            error={fieldError(state, 'submitterPhone')}
            required
          >
            <Input
              id="submitterPhone"
              name="submitterPhone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              defaultValue={profile?.phone ?? undefined}
              required
            />
          </Field>

          <Field
            label={labels.email!}
            htmlFor="submitterEmail"
            hint={labels.emailHint}
            error={fieldError(state, 'submitterEmail')}
          >
            <Input
              id="submitterEmail"
              name="submitterEmail"
              type="email"
              autoComplete="email"
              defaultValue={profile?.email ?? undefined}
            />
          </Field>

          <Field
            label={labels.organization!}
            htmlFor="submitterOrganization"
            error={fieldError(state, 'submitterOrganization')}
          >
            <Input id="submitterOrganization" name="submitterOrganization" maxLength={160} />
          </Field>
        </div>

        <p className="text-subtle text-sm">
          {labels.contactNotice}{' '}
          <Link href="/privacy" className="text-sal font-medium underline">
            {labels.privacyLink}
          </Link>
        </p>

        <div className="border-field bg-surface rounded-md border p-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consentToPublish"
              className="accent-sal mt-0.5 h-5 w-5 shrink-0"
              required
            />
            <span>{labels.consent}</span>
          </label>
          {fieldError(state, 'consentToPublish') && (
            <p role="alert" className="text-danger mt-2 text-sm font-medium">
              {fieldError(state, 'consentToPublish')}
            </p>
          )}
        </div>
      </div>

      <div className="border-line flex items-center justify-between gap-3 border-t pt-5">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className={stepIndex === 0 ? 'invisible' : undefined}
          onClick={() => setStep(STEPS[stepIndex - 1] ?? 'problem')}
        >
          {labels.back}
        </Button>

        {step === 'contact' ? (
          <Button key="submit" type="submit" size="lg" disabled={isPending || !online}>
            {isPending ? labels.submitting : labels.submit}
          </Button>
        ) : (
          <Button
            key="next"
            type="button"
            size="lg"
            onClick={() => setStep(STEPS[stepIndex + 1] ?? 'contact')}
          >
            {labels.next}
          </Button>
        )}
      </div>
    </form>
  );
}

function SubmissionReceipt({
  result,
  labels,
  locale,
}: {
  result: SubmissionResult;
  labels: SubmitFormLabels;
  locale: string;
}) {
  const definition = result.domain ? DOMAIN_DEFINITIONS[result.domain as Domain] : null;
  const domainLabel = definition
    ? locale === 'hi'
      ? definition.labelHi
      : definition.labelEn
    : null;

  return (
    <div className="space-y-6">
      <Alert tone="success" title={labels.successTitle}>
        {labels.successBody}
      </Alert>

      <div className="border-line bg-surface shadow-card rounded-2xl border p-5 sm:p-6">
        <p className="text-subtle text-sm">{labels.yourRefCode}</p>
        <p className="text-ink mt-1 font-mono text-3xl select-all">{result.refCode}</p>

        {domainLabel && (
          <p className="text-subtle mt-4 text-sm">
            {labels.routedAs} <span className="text-ink font-medium">{domainLabel}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={{ pathname: '/track', query: { ref: result.refCode } }}
            className={buttonVariants({ size: 'lg' })}
          >
            {labels.trackIt}
          </Link>
          <Link
            href="/submit"
            className="text-sal hover:text-sal-deep font-medium underline underline-offset-4"
          >
            {labels.submitAnother}
          </Link>
        </div>
      </div>

      {result.possibleDuplicates.length > 0 && (
        <section>
          <p className="font-medium">{labels.similarFound}</p>
          <ul className="divide-line border-line mt-3 divide-y border-y">
            {result.possibleDuplicates.map((dup) => (
              <li key={dup.refCode}>
                <Link
                  href={{ pathname: '/track', query: { ref: dup.refCode } }}
                  className="hover:bg-well block py-3 text-sm"
                >
                  <span className="text-subtle block font-mono text-xs">{dup.refCode}</span>
                  <span className="text-ink">{dup.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
