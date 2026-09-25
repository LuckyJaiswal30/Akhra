'use client';

import { useActionState, useEffect, useState } from 'react';
import { PROJECT_PLANNING_STATUS, type ProposalStatus } from '@akhra/shared';
import {
  ActionFeedback,
  Alert,
  Button,
  Input,
  Select,
  Textarea,
  useActionForm,
} from '@/components/ui';
import { label } from '@/lib/utils';
import { ProposalSummary } from '@/modules/lifecycle/components/proposal-summary';
import { addMemberAction, removeMemberAction, submitProposalAction } from '../actions';
import { INITIAL_UNIVERSITY_STATE } from '../state';
import type { ProjectDetail } from '../service';
import type { TeamMemberOption } from './referral-inbox';

const MEMBER_ROLES = ['faculty_mentor', 'student', 'co_investigator', 'industry_mentor'] as const;

const REVIEW_TONE: Partial<Record<ProposalStatus, 'success' | 'warning' | 'error'>> = {
  approved: 'success',
  revision_requested: 'warning',
  rejected: 'error',
};

export function ProjectWorkspace({
  project,
  candidates,
  labels,
}: {
  project: ProjectDetail;
  candidates: TeamMemberOption[];
  labels: Record<string, string>;
}) {
  const existingIds = new Set(project.members.map((m) => m.userId));
  const available = candidates.filter((c) => !existingIds.has(c.id));

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <ProposalPanel project={project} labels={labels} />
      </div>
      <div className="space-y-6">
        <TeamPanel project={project} available={available} labels={labels} />
      </div>
    </div>
  );
}

function TeamPanel({
  project,
  available,
  labels,
}: {
  project: ProjectDetail;
  available: TeamMemberOption[];
  labels: Record<string, string>;
}) {
  const [addState, addAction, isAdding] = useActionState(addMemberAction, INITIAL_UNIVERSITY_STATE);
  const addForm = useActionForm(addAction, addState);
  const [removeState, removeAction] = useActionState(removeMemberAction, INITIAL_UNIVERSITY_STATE);

  return (
    <section className="border-line bg-surface shadow-card rounded-2xl border p-5">
      <h2 className="font-medium">{labels.team}</h2>
      <p className="text-subtle mt-1 text-xs">{labels.teamHint}</p>

      <ul className="mt-4 space-y-2">
        {project.members.length === 0 && (
          <li className="text-subtle text-sm">{labels.noMembers}</li>
        )}
        {project.members.map((member) => (
          <li
            key={member.userId}
            className="border-line flex items-start justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="text-subtle text-xs">
                {label(labels, `memberRole_${member.memberRole}`)}
                {member.discipline ? `, ${member.discipline}` : ''}
              </p>
            </div>
            <form action={removeAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="userId" value={member.userId} />
              <button
                type="submit"
                className="text-danger shrink-0 text-xs underline-offset-2 hover:underline"
              >
                {labels.remove}
              </button>
            </form>
          </li>
        ))}
      </ul>

      {available.length > 0 && (
        <form {...addForm} className="border-line mt-5 space-y-3 border-t pt-4">
          <input type="hidden" name="projectId" value={project.id} />

          <ActionFeedback state={removeState ?? addState} />

          <label className="block space-y-1">
            <span className="text-xs font-medium">{labels.addMember}</span>
            <Select name="userId" required defaultValue="">
              <option value="" disabled>
                {labels.selectPerson}
              </option>
              {available.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.discipline ? ` — ${person.discipline}` : ''}
                </option>
              ))}
            </Select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium">{labels.role}</span>
            <Select name="memberRole" defaultValue="student">
              {MEMBER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {label(labels, `memberRole_${role}`)}
                </option>
              ))}
            </Select>
          </label>

          <Input name="discipline" placeholder={labels.disciplinePlaceholder} maxLength={120} />

          <Button type="submit" size="sm" variant="secondary" disabled={isAdding}>
            {labels.add}
          </Button>
        </form>
      )}
    </section>
  );
}

function ProposalPanel({
  project,
  labels,
}: {
  project: ProjectDetail;
  labels: Record<string, string>;
}) {
  const [state, action, isPending] = useActionState(submitProposalAction, INITIAL_UNIVERSITY_STATE);
  const form = useActionForm(action, state);
  const existing = project.latestProposal;
  const [editing, setEditing] = useState(!existing);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!existing && project.status !== PROJECT_PLANNING_STATUS) return null;

  if (existing && !editing) {
    const decided = existing.reviewedAt !== null && existing.status !== 'submitted';
    const canRevise =
      project.status === PROJECT_PLANNING_STATUS &&
      (existing.status === 'draft' ||
        existing.status === 'revision_requested' ||
        existing.status === 'rejected');

    return (
      <section className="border-line bg-surface shadow-card rounded-2xl border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">
            {labels.proposal}{' '}
            <span className="text-subtle text-sm font-normal">v{existing.version}</span>
          </h2>
          <span className="border-line rounded-full border px-2.5 py-0.5 text-xs">
            {label(labels, `proposalStatus_${existing.status}`)}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {existing.status === 'submitted' && (
            <Alert tone="info">{label(labels, 'proposalAwaitingReview')}</Alert>
          )}
          {decided && (
            <Alert
              tone={REVIEW_TONE[existing.status] ?? 'info'}
              title={label(labels, `proposalDecided_${existing.status}`)}
            >
              {existing.reviewNote && <p className="whitespace-pre-line">{existing.reviewNote}</p>}
              {existing.reviewerName && (
                <p className="text-subtle mt-1 text-xs">— {existing.reviewerName}</p>
              )}
            </Alert>
          )}
          <ProposalSummary proposal={existing} labels={labels} />
        </div>

        {canRevise && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-5"
            onClick={() => setEditing(true)}
          >
            {labels.reviseProposal}
          </Button>
        )}
      </section>
    );
  }

  return (
    <form {...form} className="border-line bg-surface shadow-card rounded-2xl border p-5">
      <h2 className="font-medium">{existing ? labels.reviseProposal : labels.writeProposal}</h2>
      <p className="text-subtle mt-1 text-xs">{labels.proposalHint}</p>

      <input type="hidden" name="projectId" value={project.id} />

      <div className="mt-5 space-y-4">
        <ActionFeedback state={state} />

        <label className="block space-y-1">
          <span className="text-xs font-medium">{labels.abstract}</span>
          <Textarea name="abstract" rows={4} defaultValue={existing?.abstract} required />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium">{labels.methodology}</span>
          <Textarea name="methodology" rows={5} defaultValue={existing?.methodology} required />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium">{labels.expectedOutcomes}</span>
          <Textarea
            name="expectedOutcomes"
            rows={3}
            defaultValue={existing?.expectedOutcomes}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium">{labels.timelineMonths}</span>
            <Input
              name="timelineMonths"
              type="number"
              min="1"
              max="60"
              defaultValue={existing?.timelineMonths ?? 12}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">{labels.budgetOptional}</span>
            <Input
              name="budgetEstimate"
              type="number"
              min="0"
              step="1000"
              defaultValue={existing?.budgetEstimate ?? ''}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="status" value="submitted" size="sm" disabled={isPending}>
            {isPending ? labels.saving : labels.submitProposal}
          </Button>
          <Button
            type="submit"
            name="status"
            value="draft"
            size="sm"
            variant="secondary"
            disabled={isPending}
          >
            {labels.saveDraft}
          </Button>
          {existing && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {labels.cancel}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
