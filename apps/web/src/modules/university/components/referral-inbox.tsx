'use client';

import { useActionState, useState } from 'react';
import { DOMAIN_DEFINITIONS, STATUS_DEFINITIONS, type ProblemStatus } from '@akhra/shared';
import {
  ActionFeedback,
  Button,
  ClampedText,
  Input,
  Select,
  Textarea,
  useActionForm,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { formatDate, label } from '@/lib/utils';
import { createProjectAction, respondToRoutingAction } from '../actions';
import { INITIAL_UNIVERSITY_STATE } from '../state';
import type { RoutedProblem } from '../service';

export interface TeamMemberOption {
  id: string;
  name: string | null;
  designation: string | null;
  discipline: string | null;
}

export function ReferralInbox({
  referrals,
  members,
  locale,
  labels,
}: {
  referrals: RoutedProblem[];
  members: TeamMemberOption[];
  locale: string;
  labels: Record<string, string>;
}) {
  if (referrals.length === 0) {
    return (
      <p className="border-line text-subtle border-y px-6 py-10 text-center text-sm">
        {labels.empty}
      </p>
    );
  }

  return (
    <ul className="divide-line border-line divide-y border-y">
      {referrals.map((referral) => (
        <li key={referral.routingId}>
          <ReferralCard referral={referral} members={members} locale={locale} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

function ReferralCard({
  referral,
  members,
  locale,
  labels,
}: {
  referral: RoutedProblem;
  members: TeamMemberOption[];
  locale: string;
  labels: Record<string, string>;
}) {
  const isHindi = locale === 'hi';
  const definition = referral.domain ? DOMAIN_DEFINITIONS[referral.domain] : null;
  const statusDef = STATUS_DEFINITIONS[referral.status as ProblemStatus];

  return (
    <article className="py-6">
      <div className="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-mono">{referral.refCode}</span>
        <span>{referral.districtName}</span>
        <span>{formatDate(referral.createdAt, isHindi ? 'hi-IN' : 'en-IN')}</span>
      </div>

      <h3 className="mt-1.5 font-medium">{referral.title}</h3>
      <ClampedText
        text={referral.description}
        moreLabel={labels.showMore!}
        lessLabel={labels.showLess!}
        className="text-subtle mt-2 text-sm"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {definition && (
          <span className="bg-well rounded-full px-2.5 py-0.5 text-xs">
            {isHindi ? definition.labelHi : definition.labelEn}
          </span>
        )}
        <span className="border-line rounded-full border px-2.5 py-0.5 text-xs">
          {isHindi ? statusDef.labelHi : statusDef.labelEn}
        </span>
        <span className="text-subtle text-xs">
          {labels.match} {Math.round(referral.matchScore * 100)}%
          {referral.matchRationale && `, ${referral.matchRationale}`}
        </span>
      </div>

      {referral.brief && (
        <div className="bg-mint mt-4 rounded-xl p-4">
          <p className="text-sal-deep text-xs font-semibold">{labels.brief}</p>
          <p className="text-ink mt-1 text-sm whitespace-pre-line">{referral.brief}</p>
        </div>
      )}

      <div className="border-line mt-5 border-t pt-4">
        {referral.projectId ? (
          <Link
            href={`/projects/${referral.projectId}`}
            className="text-sal text-sm font-medium underline-offset-4 hover:underline"
          >
            {labels.openProject}
          </Link>
        ) : referral.response === 'accepted' ? (
          <StartProjectForm referral={referral} members={members} labels={labels} />
        ) : referral.response === 'proposed' ? (
          <RespondForm routingId={referral.routingId} labels={labels} />
        ) : (
          <p className="text-subtle text-sm">{label(labels, `response_${referral.response}`)}</p>
        )}
      </div>
    </article>
  );
}

function RespondForm({ routingId, labels }: { routingId: string; labels: Record<string, string> }) {
  const [state, action, isPending] = useActionState(
    respondToRoutingAction,
    INITIAL_UNIVERSITY_STATE,
  );
  const form = useActionForm(action, state);

  return (
    <form {...form} className="space-y-3">
      <input type="hidden" name="routingId" value={routingId} />

      <ActionFeedback state={state} />

      <Textarea name="note" rows={2} maxLength={1000} placeholder={labels.responsePlaceholder} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="response" value="accepted" size="sm" disabled={isPending}>
          {labels.accept}
        </Button>
        <Button
          type="submit"
          name="response"
          value="declined"
          size="sm"
          variant="secondary"
          disabled={isPending}
        >
          {labels.decline}
        </Button>
        <Button
          type="submit"
          name="response"
          value="reassign_requested"
          size="sm"
          variant="ghost"
          disabled={isPending}
        >
          {labels.requestReassign}
        </Button>
      </div>
    </form>
  );
}

function StartProjectForm({
  referral,
  members,
  labels,
}: {
  referral: RoutedProblem;
  members: TeamMemberOption[];
  labels: Record<string, string>;
}) {
  const [state, action, isPending] = useActionState(createProjectAction, null);
  const form = useActionForm(action, state);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-subtle text-sm">{labels.accepted}</span>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {labels.startProject}
        </Button>
      </div>
    );
  }

  return (
    <form {...form} className="space-y-3">
      <input type="hidden" name="problemId" value={referral.problemId} />

      <ActionFeedback state={state} />

      <label className="block space-y-1">
        <span className="text-xs font-medium">{labels.projectTitle}</span>
        <Input name="title" placeholder={labels.projectTitlePlaceholder} maxLength={180} required />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium">{labels.projectSummary}</span>
        <Textarea
          name="summary"
          rows={3}
          maxLength={3000}
          placeholder={labels.summaryPlaceholder}
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium">{labels.facultyMentor}</span>
        <Select name="facultyMentorId" defaultValue="">
          <option value="">{labels.assignLater}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
              {member.discipline ? ` — ${member.discipline}` : ''}
            </option>
          ))}
        </Select>
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? labels.saving : labels.createProject}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
          {labels.cancel}
        </Button>
      </div>
    </form>
  );
}
