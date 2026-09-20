'use client';

import { useActionState } from 'react';
import { AlarmClock, RotateCcw } from 'lucide-react';
import { ActionFeedback, Button, Textarea, useActionForm } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { actionTakenAction, type AdminActionState } from '../actions';
import type { DepartmentBucket, DepartmentReport } from '../service-department';

const INITIAL: AdminActionState = null;

export function DepartmentBoard({
  reports,
  bucket,
  locale,
  labels,
}: {
  reports: DepartmentReport[];
  bucket: DepartmentBucket;
  locale: string;
  labels: Record<string, string>;
}) {
  if (reports.length === 0) {
    return (
      <p className="border-line text-subtle border-y px-6 py-10 text-center text-sm">
        {labels.empty}
      </p>
    );
  }

  return (
    <ul className="divide-line border-line divide-y border-y">
      {reports.map((report) => (
        <li key={report.id}>
          <ReportCard report={report} bucket={bucket} locale={locale} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

function ReportCard({
  report,
  bucket,
  locale,
  labels,
}: {
  report: DepartmentReport;
  bucket: DepartmentBucket;
  locale: string;
  labels: Record<string, string>;
}) {
  const intlLocale = locale === 'hi' ? 'hi-IN' : 'en-IN';
  const overdue = report.dueAt != null && report.dueAt.getTime() < Date.now();

  return (
    <article className="py-6">
      <div className="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-mono">{report.refCode}</span>
        <span>{report.districtName}</span>
        <span>{formatDate(report.createdAt, intlLocale)}</span>
        {report.dueAt && bucket === 'open' && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${
              overdue ? 'bg-danger-wash text-danger' : 'bg-well text-subtle'
            }`}
          >
            <AlarmClock aria-hidden className="h-3.5 w-3.5" />
            {overdue ? labels.overdue : labels.dueOn} {formatDate(report.dueAt, intlLocale)}
          </span>
        )}
        {report.reopenCount > 0 && (
          <span className="bg-warning-wash text-warning inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium">
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            {labels.reopened}
          </span>
        )}
      </div>

      <h3 className="mt-1.5 font-medium">{report.title}</h3>
      <p className="text-subtle mt-2 text-sm">{report.description}</p>

      {report.reopenCount > 0 && report.reporterNote && (
        <div className="border-warning/40 bg-warning-wash mt-4 rounded-md border p-3">
          <p className="text-xs font-medium">{labels.reporterSaid}</p>
          <p className="mt-1 text-sm whitespace-pre-line">{report.reporterNote}</p>
        </div>
      )}

      {report.actionTakenNote && bucket !== 'open' && (
        <div className="border-line bg-well/40 mt-4 rounded-md border p-3">
          <p className="text-xs font-medium">
            {labels.actionTakenLabel}
            {report.actionTakenAt && ` · ${formatDate(report.actionTakenAt, intlLocale)}`}
          </p>
          <p className="mt-1 text-sm whitespace-pre-line">{report.actionTakenNote}</p>
        </div>
      )}

      {bucket === 'open' && (
        <div className="border-line mt-5 border-t pt-5">
          <ActionTakenForm problemId={report.id} labels={labels} />
        </div>
      )}
    </article>
  );
}

function ActionTakenForm({
  problemId,
  labels,
}: {
  problemId: string;
  labels: Record<string, string>;
}) {
  const [state, action, isPending] = useActionState(actionTakenAction, INITIAL);
  const form = useActionForm(action, state);

  return (
    <form {...form} className="space-y-3">
      <input type="hidden" name="problemId" value={problemId} />
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
