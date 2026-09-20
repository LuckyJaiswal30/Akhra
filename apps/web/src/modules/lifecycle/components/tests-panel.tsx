'use client';

import { useActionState, useState } from 'react';
import { TEST_RESULTS, type TestResult } from '@akhra/shared';
import {
  ActionFeedback,
  Button,
  Field,
  fieldError,
  Input,
  Select,
  Textarea,
  useActionForm,
} from '@/components/ui';
import { formatDate, label, type Labels } from '@/lib/utils';
import { recordTestAction } from '../actions';
import type { Lifecycle } from '../service';
import { INITIAL_LIFECYCLE_STATE } from '../state';
import { Panel } from './project-panel';

const RESULT_TONE: Record<TestResult, string> = {
  passed: 'bg-sal-wash text-sal-deep',
  failed: 'bg-danger-wash text-danger',
  inconclusive: 'bg-warning-wash text-warning',
};

export function TestsPanel({
  projectId,
  lifecycle,
  locale,
  labels,
}: {
  projectId: string;
  lifecycle: Lifecycle;
  locale: string;
  labels: Labels;
}) {
  const [state, action, isPending] = useActionState(recordTestAction, INITIAL_LIFECYCLE_STATE);
  const form = useActionForm(action, state);
  const [open, setOpen] = useState(false);
  const isHindi = locale === 'hi';

  return (
    <Panel title={label(labels, 'tests')} hint={label(labels, 'testsHint')}>
      {lifecycle.tests.length === 0 ? (
        <p className="text-subtle text-sm">{label(labels, 'noTests')}</p>
      ) : (
        <ul className="space-y-3">
          {lifecycle.tests.map((test) => (
            <li key={test.id} className="border-line rounded-md border px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RESULT_TONE[test.result]}`}
                >
                  {label(labels, `testResult_${test.result}`)}
                </span>
                <span className="text-sm font-medium">{test.title}</span>
              </div>
              <p className="text-subtle mt-1 text-xs">
                {[
                  formatDate(test.conductedOn, isHindi ? 'hi-IN' : 'en-IN'),
                  test.milestoneTitle,
                  test.recordedBy,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div>
                  <dt className="text-subtle text-xs">{label(labels, 'testMethod')}</dt>
                  <dd className="whitespace-pre-line">{test.method}</dd>
                </div>
                <div>
                  <dt className="text-subtle text-xs">{label(labels, 'testFindings')}</dt>
                  <dd className="whitespace-pre-line">{test.findings}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {lifecycle.canManage &&
        (open ? (
          <form {...form} className="border-line mt-5 space-y-4 border-t pt-4">
            <input type="hidden" name="projectId" value={projectId} />
            <ActionFeedback state={state} />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Field
                label={label(labels, 'testTitle')}
                htmlFor="test-title"
                error={fieldError(state, 'title')}
                required
              >
                <Input id="test-title" name="title" maxLength={200} required />
              </Field>
              <Field
                label={label(labels, 'testDate')}
                htmlFor="test-date"
                error={fieldError(state, 'conductedOn')}
                required
              >
                <Input id="test-date" name="conductedOn" type="date" required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={label(labels, 'testResultLabel')}
                htmlFor="test-result"
                error={fieldError(state, 'result')}
                required
              >
                <Select id="test-result" name="result" defaultValue="passed">
                  {TEST_RESULTS.map((result) => (
                    <option key={result} value={result}>
                      {label(labels, `testResult_${result}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={label(labels, 'testMilestone')} htmlFor="test-milestone">
                <Select id="test-milestone" name="milestoneId" defaultValue="">
                  <option value="">{label(labels, 'noMilestoneLink')}</option>
                  {lifecycle.milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label={label(labels, 'testMethod')}
              htmlFor="test-method"
              hint={label(labels, 'testMethodHint')}
              error={fieldError(state, 'method')}
              required
            >
              <Textarea id="test-method" name="method" rows={2} maxLength={2000} required />
            </Field>
            <Field
              label={label(labels, 'testFindings')}
              htmlFor="test-findings"
              error={fieldError(state, 'findings')}
              required
            >
              <Textarea id="test-findings" name="findings" rows={3} maxLength={3000} required />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {label(labels, 'recordTest')}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
                {label(labels, 'cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-4"
            onClick={() => setOpen(true)}
          >
            {label(labels, 'recordTest')}
          </Button>
        ))}
    </Panel>
  );
}
