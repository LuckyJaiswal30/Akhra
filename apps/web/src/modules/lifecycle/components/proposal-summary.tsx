import type { ReactNode } from 'react';
import { label, type Labels } from '@/lib/utils';

export interface ProposalContent {
  abstract: string;
  methodology: string;
  expectedOutcomes: string;
  timelineMonths: number;
  budgetEstimate: string | null;
}

export function ProposalSummary({
  proposal,
  labels,
}: {
  proposal: ProposalContent;
  labels: Labels;
}) {
  return (
    <dl className="space-y-4 text-sm">
      <Entry term={label(labels, 'abstract')}>{proposal.abstract}</Entry>
      <Entry term={label(labels, 'methodology')}>{proposal.methodology}</Entry>
      <Entry term={label(labels, 'expectedOutcomes')}>{proposal.expectedOutcomes}</Entry>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Entry term={label(labels, 'timeline')}>
          {proposal.timelineMonths} {label(labels, 'months')}
        </Entry>
        {proposal.budgetEstimate && (
          <Entry term={label(labels, 'budget')}>
            ₹{Number(proposal.budgetEstimate).toLocaleString('en-IN')}
          </Entry>
        )}
      </div>
    </dl>
  );
}

function Entry({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-subtle">{term}</dt>
      <dd className="text-ink mt-1 whitespace-pre-line">{children}</dd>
    </div>
  );
}
