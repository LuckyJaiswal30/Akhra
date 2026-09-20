'use client';

import { Alert } from '@/components/ui';
import { label, type Labels } from '@/lib/utils';
import type { Lifecycle } from '../service';
import { DocumentsPanel } from './documents-panel';
import { MilestonesPanel } from './milestones-panel';
import { OutcomesPanel } from './outcomes-panel';
import { StagePanel } from './stage-panel';
import { TestsPanel } from './tests-panel';

export function LifecyclePanel({
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
  if (!lifecycle.underway) {
    return (
      <div className="space-y-6">
        <Alert tone="info" title={label(labels, 'planningTitle')}>
          {label(labels, 'planningBody')}
        </Alert>
        <DocumentsPanel
          projectId={projectId}
          lifecycle={lifecycle}
          locale={locale}
          labels={labels}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StagePanel projectId={projectId} lifecycle={lifecycle} locale={locale} labels={labels} />
      <MilestonesPanel
        projectId={projectId}
        lifecycle={lifecycle}
        locale={locale}
        labels={labels}
      />
      <DocumentsPanel projectId={projectId} lifecycle={lifecycle} locale={locale} labels={labels} />
      <TestsPanel projectId={projectId} lifecycle={lifecycle} locale={locale} labels={labels} />
      <OutcomesPanel projectId={projectId} lifecycle={lifecycle} locale={locale} labels={labels} />
    </div>
  );
}
