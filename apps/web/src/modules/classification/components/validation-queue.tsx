'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  DISTRICT_BY_CODE,
  DOMAIN_DEFINITIONS,
  DOMAIN_LIST,
  JHARKHAND_DISTRICTS,
  type ActionState,
  type PriorityLevel,
} from '@akhra/shared';
import {
  ActionFeedback,
  Alert,
  Button,
  ClampedText,
  Select,
  Textarea,
  useActionForm,
} from '@/components/ui';
import { AlarmClock, TriangleAlert } from 'lucide-react';
import { ProblemFiles } from '@/components/problem-files';
import { formatDate } from '@/lib/utils';
import type { ProblemFile } from '@/modules/citizen';
import {
  actionTakenAction,
  assignDepartmentAction,
  decideProblemAction,
  routeProblemAction,
  type AdminActionState,
} from '../actions';
import type { DepartmentOption } from '../service-department';
import type { QueueItem } from '../service-admin';
import type { RoutingSuggestion } from '../routing';

const INITIAL: AdminActionState = null;

const NOTE_PLACEHOLDER: Record<string, (labels: Record<string, string>) => string | undefined> = {
  validate: (l) => l.notePlaceholder,
  reject: (l) => l.notePlaceholder,
  mark_duplicate: (l) => l.notePlaceholder,
  resolve: (l) => l.resolveNotePlaceholder,
  transfer: (l) => l.transferPlaceholder,
};

export interface QueueEntry extends QueueItem {
  suggestions: RoutingSuggestion[];
  duplicates: { refCode: string; title: string; similarity: number; problemId: string }[];
  files: ProblemFile[];
  duplicateCheckFailed?: boolean;
}

export type QueueMode = 'validate' | 'route' | 'department';

export function ValidationQueue({
  entries,
  mode,
  locale,
  labels,
  departments = [],
}: {
  entries: QueueEntry[];
  mode: QueueMode;
  locale: string;
  labels: Record<string, string>;
  departments?: DepartmentOption[];
}) {
  /**
   * Every decision moves the report out of the tab it was in, so the row carrying the confirmation
   * unmounts — in the same commit as the action's result, which means an effect inside the row may
   * never run at all. An officer pressed Record decision and the screen simply went empty.
   *
   * So the queue watches instead: it notes which report a form was submitted for, and confirms it
   * when that report leaves the list. A refusal leaves the row where it is, and the row's own
   * message shows there.
   */
  const [acting, setActing] = useState<{ id: string; refCode: string } | null>(null);
  const [done, setDone] = useState<{ title: string; message: string } | null>(null);
  const present = entries.some((entry) => entry.id === acting?.id);

  useEffect(() => {
    if (!acting || present) return;
    setDone({ title: acting.refCode, message: labels.recorded ?? '' });
    setActing(null);
  }, [acting, present, labels.recorded]);

  return (
    <div className="space-y-4">
      {done && (
        <Alert tone="success">
          <span className="font-medium">{done.title}</span> — {done.message}
        </Alert>
      )}

      {entries.length === 0 ? (
        <p className="border-line text-subtle border-y px-6 py-10 text-center text-sm">
          {labels.empty}
        </p>
      ) : (
        <ul className="divide-line border-line divide-y border-y">
          {entries.map((entry) => (
            <li key={entry.id}>
              <QueueCard
                entry={entry}
                mode={mode}
                locale={locale}
                labels={labels}
                departments={departments}
                onDone={(message) => setDone({ title: entry.refCode, message })}
                onSubmitted={() => setActing({ id: entry.id, refCode: entry.refCode })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Reports an action's success message up to the queue, for the rows that survive it. */
function useReportDone(state: ActionState<unknown>, onDone: (message: string) => void): void {
  const seen = useRef<ActionState<unknown>>(null);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state?.ok && state.message) onDone(state.message);
  }, [state, onDone]);
}

const PRIORITY_TONE: Record<PriorityLevel, string> = {
  critical: 'bg-danger text-on-danger',
  high: 'bg-danger-wash text-danger',
  medium: 'bg-warning-wash text-warning',
  low: 'bg-well text-subtle',
};

function QueueCard({
  entry,
  mode,
  locale,
  labels,
  departments,
  onDone,
  onSubmitted,
}: {
  entry: QueueEntry;
  mode: QueueMode;
  locale: string;
  labels: Record<string, string>;
  departments: DepartmentOption[];
  onDone: (message: string) => void;
  onSubmitted: () => void;
}) {
  const isHindi = locale === 'hi';
  const definition = entry.domain ? DOMAIN_DEFINITIONS[entry.domain] : null;

  return (
    <article className="py-6">
      <div className="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-mono">{entry.refCode}</span>
        <span>{entry.districtName}</span>
        <span>{formatDate(entry.createdAt, isHindi ? 'hi-IN' : 'en-IN')}</span>
        <span>{entry.submitterName}</span>
        {entry.dueAt && (
          <span
            className={
              entry.dueAt.getTime() < Date.now()
                ? 'bg-danger-wash text-danger inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium'
                : 'bg-well text-subtle inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium'
            }
          >
            <AlarmClock aria-hidden className="h-3.5 w-3.5" />
            {entry.dueAt.getTime() < Date.now() ? labels.overdue : labels.dueOn}{' '}
            {formatDate(entry.dueAt, isHindi ? 'hi-IN' : 'en-IN')}
          </span>
        )}
        {entry.assignedOrgName && <span>{entry.assignedOrgName}</span>}
        {entry.transferredFromCode && (
          <span className="bg-well text-subtle rounded-full px-2.5 py-0.5 font-medium">
            {labels.movedFrom}{' '}
            {isHindi
              ? (DISTRICT_BY_CODE[entry.transferredFromCode]?.nameHi ?? entry.transferredFromCode)
              : (DISTRICT_BY_CODE[entry.transferredFromCode]?.nameEn ?? entry.transferredFromCode)}
          </span>
        )}
        {entry.reopenCount > 0 && (
          <span className="bg-warning-wash text-warning rounded-full px-2.5 py-0.5 font-medium">
            {labels.reopened}
          </span>
        )}
        {entry.escalatedAt && (
          <span className="bg-warning-wash text-warning inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium">
            <AlarmClock aria-hidden className="h-3.5 w-3.5" />
            {labels.escalated}
          </span>
        )}
      </div>

      <h3 className="mt-1.5 font-medium">{entry.title}</h3>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span
          className={`rounded-full px-2.5 py-0.5 font-semibold ${PRIORITY_TONE[entry.priority]}`}
        >
          {labels[`priority_${entry.priority}`]}
        </span>
        {entry.priorityReasons.length > 0 && (
          <span className="text-subtle">
            {entry.priorityReasons.map((reason) => labels[`reason_${reason}`]).join(' · ')}
          </span>
        )}
      </p>

      <ClampedText
        text={entry.description}
        moreLabel={labels.showMore!}
        lessLabel={labels.showLess!}
        className="text-subtle mt-2 text-sm"
      />

      {entry.files.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium">{labels.files}</p>
          <ProblemFiles files={entry.files} compact className="mt-2" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {definition && (
          <span className="bg-well rounded-full px-2.5 py-0.5 text-xs">
            {isHindi ? definition.labelHi : definition.labelEn}
          </span>
        )}
        {entry.classifiedBy && (
          <span className="border-line text-subtle rounded-full border px-2.5 py-0.5 text-xs">
            {labels.classifiedBy} {entry.classifiedBy}
            {entry.domainConfidence != null && ` (${Math.round(entry.domainConfidence * 100)}%)`}
          </span>
        )}
      </div>

      {entry.duplicateCheckFailed && (
        <p className="border-warning/40 bg-warning-wash text-ink mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs">
          <TriangleAlert aria-hidden className="text-warning mt-0.5 h-4 w-4 shrink-0" />
          {labels.duplicateCheckFailed}
        </p>
      )}

      {entry.duplicates.length > 0 && (
        <div className="border-line bg-well/40 mt-4 rounded-md border p-3">
          <p className="text-xs font-medium">{labels.possibleDuplicates}</p>
          <ul className="text-subtle mt-1.5 space-y-1 text-xs">
            {entry.duplicates.map((dup) => (
              <li key={dup.problemId}>
                <span className="font-mono">{dup.refCode}</span> — {dup.title} (
                {Math.round(dup.similarity * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-line mt-5 border-t pt-5">
        {mode === 'validate' && (
          <div className="space-y-5">
            <DecisionForm
              entry={entry}
              locale={locale}
              labels={labels}
              onDone={onDone}
              onSubmitted={onSubmitted}
            />
            {departments.length > 0 && (
              <div className="border-line border-t pt-5">
                <AssignDepartmentForm
                  entry={entry}
                  labels={labels}
                  departments={departments}
                  onDone={onDone}
                  onSubmitted={onSubmitted}
                />
              </div>
            )}
          </div>
        )}
        {mode === 'route' && (
          <RoutingForm entry={entry} labels={labels} onDone={onDone} onSubmitted={onSubmitted} />
        )}
        {mode === 'department' && (
          <ActionTakenForm
            entry={entry}
            labels={labels}
            onDone={onDone}
            onSubmitted={onSubmitted}
          />
        )}
      </div>
    </article>
  );
}

function DecisionForm({
  entry,
  locale,
  labels,
  onDone,
  onSubmitted,
}: {
  entry: QueueEntry;
  locale: string;
  labels: Record<string, string>;
  onDone: (message: string) => void;
  onSubmitted: () => void;
}) {
  const [state, action, isPending] = useActionState(decideProblemAction, INITIAL);
  const form = useActionForm(action, state, onSubmitted);
  useReportDone(state, onDone);
  const [decision, setDecision] = useState<
    'validate' | 'resolve' | 'transfer' | 'reject' | 'mark_duplicate'
  >('validate');
  const isHindi = locale === 'hi';

  return (
    <form {...form} className="space-y-3">
      <input type="hidden" name="problemId" value={entry.id} />

      <ActionFeedback state={state} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium">{labels.decision}</span>
          <Select
            name="decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value as typeof decision)}
          >
            <option value="validate">{labels.decisionValidate}</option>
            <option value="resolve">{labels.decisionResolve}</option>
            <option value="transfer">{labels.decisionTransfer}</option>
            <option value="reject">{labels.decisionReject}</option>
            <option value="mark_duplicate">{labels.decisionDuplicate}</option>
          </Select>
        </label>

        {decision === 'validate' && (
          <label className="space-y-1">
            <span className="text-xs font-medium">{labels.correctDomain}</span>
            <Select name="domain" defaultValue="">
              <option value="">{labels.keepDomain}</option>
              {DOMAIN_LIST.map((d) => (
                <option key={d.id} value={d.id}>
                  {isHindi ? d.labelHi : d.labelEn}
                </option>
              ))}
            </Select>
          </label>
        )}

        {decision === 'transfer' && (
          <label className="space-y-1">
            <span className="text-xs font-medium">{labels.transferDistrict}</span>
            <Select name="districtCode" defaultValue="" required>
              <option value="">{labels.selectDistrict}</option>
              {JHARKHAND_DISTRICTS.filter((d) => d.code !== entry.districtCode).map((d) => (
                <option key={d.code} value={d.code}>
                  {isHindi ? d.nameHi : d.nameEn}
                </option>
              ))}
            </Select>
          </label>
        )}

        {decision === 'mark_duplicate' && (
          <label className="space-y-1">
            <span className="text-xs font-medium">{labels.mergeInto}</span>
            <Select name="duplicateOfId" required>
              <option value="">{labels.selectOriginal}</option>
              {entry.duplicates.map((dup) => (
                <option key={dup.problemId} value={dup.problemId}>
                  {dup.refCode} — {dup.title}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium">
          {decision === 'transfer' ? labels.transferReason : labels.note}
        </span>
        <Textarea
          name="note"
          rows={2}
          maxLength={1000}
          required={decision === 'resolve' || decision === 'transfer'}
          placeholder={NOTE_PLACEHOLDER[decision]?.(labels)}
        />
      </label>

      {decision === 'transfer' && <p className="text-subtle text-xs">{labels.transferHint}</p>}

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? labels.saving : decision === 'transfer' ? labels.transfer : labels.record}
      </Button>
    </form>
  );
}

function RoutingForm({
  entry,
  labels,
  onDone,
  onSubmitted,
}: {
  entry: QueueEntry;
  labels: Record<string, string>;
  onDone: (message: string) => void;
  onSubmitted: () => void;
}) {
  const [state, action, isPending] = useActionState(routeProblemAction, INITIAL);
  const form = useActionForm(action, state, onSubmitted);
  useReportDone(state, onDone);

  return (
    <form {...form} className="space-y-3">
      <input type="hidden" name="problemId" value={entry.id} />

      <ActionFeedback state={state} />

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium">{labels.suggestedInstitutions}</legend>
        {entry.suggestions.length === 0 ? (
          <p className="text-subtle text-xs">{labels.noSuggestions}</p>
        ) : (
          entry.suggestions.map((suggestion, index) => (
            <label
              key={suggestion.organizationId}
              className="border-line flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm"
            >
              <input
                type="checkbox"
                name="organizationIds"
                value={suggestion.organizationId}
                defaultChecked={index === 0}
                className="mt-0.5 h-4 w-4"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{suggestion.name}</span>
                <span className="text-subtle block text-xs">
                  {suggestion.rationale}, {labels.match} {Math.round(suggestion.matchScore * 100)}%
                </span>
              </span>
            </label>
          ))
        )}
      </fieldset>

      <label className="block space-y-1">
        <span className="text-xs font-medium">{labels.note}</span>
        <Textarea name="note" rows={2} maxLength={1000} placeholder={labels.routeNotePlaceholder} />
      </label>

      <Button type="submit" size="sm" disabled={isPending || entry.suggestions.length === 0}>
        {isPending ? labels.saving : labels.route}
      </Button>
    </form>
  );
}

function AssignDepartmentForm({
  onDone,
  onSubmitted,
  entry,
  labels,
  departments,
}: {
  entry: QueueEntry;
  labels: Record<string, string>;
  departments: DepartmentOption[];
  onDone: (message: string) => void;
  onSubmitted: () => void;
}) {
  const [state, action, isPending] = useActionState(assignDepartmentAction, INITIAL);
  const form = useActionForm(action, state, onSubmitted);
  useReportDone(state, onDone);

  return (
    <form {...form} className="space-y-3">
      <input type="hidden" name="problemId" value={entry.id} />
      <ActionFeedback state={state} />
      <p className="text-xs font-medium">{labels.assignTitle}</p>
      <p className="text-subtle text-xs">{labels.assignHint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium">{labels.department}</span>
          <Select name="organizationId" defaultValue="" required>
            <option value="" disabled>
              {labels.selectDepartment}
            </option>
            {departments.map((department) => (
              // The full name, as it appears on an order. An officer choosing where a citizen's
              // report goes should not have to decode "UD&HD".
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <Textarea name="note" rows={2} placeholder={labels.assignNotePlaceholder} maxLength={1000} />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? labels.saving : labels.assign}
      </Button>
    </form>
  );
}

function ActionTakenForm({
  entry,
  labels,
  onDone,
  onSubmitted,
}: {
  entry: QueueEntry;
  labels: Record<string, string>;
  onDone: (message: string) => void;
  onSubmitted: () => void;
}) {
  const [state, action, isPending] = useActionState(actionTakenAction, INITIAL);
  const form = useActionForm(action, state, onSubmitted);
  useReportDone(state, onDone);

  return (
    <form {...form} className="space-y-3">
      <input type="hidden" name="problemId" value={entry.id} />
      <ActionFeedback state={state} />
      <p className="text-xs font-medium">{labels.actionTakenTitle}</p>
      <p className="text-subtle text-xs">{labels.actionTakenHint}</p>
      <Textarea
        name="note"
        rows={3}
        placeholder={labels.actionTakenPlaceholder}
        maxLength={1000}
        required
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? labels.saving : labels.recordActionTaken}
      </Button>
    </form>
  );
}
