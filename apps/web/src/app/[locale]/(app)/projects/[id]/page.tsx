import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PROJECT_PLANNING_STATUS, PROPOSAL_STATUSES } from '@akhra/shared';
import {
  getLifecycle,
  LifecyclePanel,
  ProposalReviewForm,
  ProposalSummary,
} from '@/modules/lifecycle';
import {
  buildThreadLabels,
  getThreadAccess,
  listThread,
  ThreadPanel,
} from '@/modules/notifications';

import { getProject, listOrganizationMembers, ProjectWorkspace } from '@/modules/university';
import { Link } from '@/i18n/navigation';
import { requireActor } from '@/server/session';

const MEMBER_ROLES = ['faculty_mentor', 'student', 'co_investigator', 'industry_mentor'] as const;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const actor = await requireActor();
  const project = await getProject(actor, id);
  if (!project) notFound();

  const lifecycle = await getLifecycle(actor, id);
  const thread = await listThread(actor, project.problemId);
  const threadAccess = await getThreadAccess(actor, project.problemId);
  const threadLabels = await buildThreadLabels(locale);
  const isOwningTeam =
    actor.organizationId === lifecycle.organizationId &&
    (actor.role === 'university_admin' || actor.role === 'faculty');
  const candidates = isOwningTeam ? await listOrganizationMembers(actor) : [];

  const reviewable =
    lifecycle.canApprove &&
    project.status === PROJECT_PLANNING_STATUS &&
    project.latestProposal?.status === 'submitted';
  const messages = await getMessages();
  const reviewLabels = {
    ...(messages.project as Record<string, string>),
    ...(messages.proposalReview as Record<string, string>),
  };

  const t = await getTranslations('project');
  const tu = await getTranslations('university');

  const workspaceLabels: Record<string, string> = {};
  for (const key of [
    'team',
    'teamHint',
    'noMembers',
    'addMember',
    'selectPerson',
    'role',
    'disciplinePlaceholder',
    'add',
    'remove',
    'proposal',
    'proposalHint',
    'writeProposal',
    'reviseProposal',
    'abstract',
    'methodology',
    'expectedOutcomes',
    'timeline',
    'timelineMonths',
    'months',
    'budget',
    'budgetOptional',
    'submitProposal',
    'saveDraft',
    'saving',
    'cancel',
    'proposalAwaitingReview',
    'proposalDecided_approved',
    'proposalDecided_revision_requested',
    'proposalDecided_rejected',
  ]) {
    workspaceLabels[key] = t(key);
  }
  for (const role of MEMBER_ROLES) workspaceLabels[`memberRole_${role}`] = t(`memberRole_${role}`);
  for (const status of PROPOSAL_STATUSES) {
    workspaceLabels[`proposalStatus_${status}`] = t(`proposalStatus_${status}`);
  }

  const lifecycleLabels = messages.lifecycle as Record<string, string>;

  return (
    <div className="space-y-8">
      {isOwningTeam && (
        <Link
          href="/university/projects"
          className="text-subtle text-sm underline-offset-4 hover:underline"
        >
          {t('backToReferrals')}
        </Link>
      )}

      <header>
        <p className="text-subtle font-mono text-xs">{project.refCode}</p>
        <h1 className="mt-1 text-2xl font-bold">{project.title}</h1>
        <p className="text-subtle mt-2 text-sm">{project.summary}</p>
        <p className="text-subtle mt-3 text-xs">
          {[
            project.organizationName,
            project.districtName,
            project.facultyMentorName && `${tu('facultyMentor')}: ${project.facultyMentorName}`,
          ]
            .filter(Boolean)
            .join(', ')}
        </p>
      </header>

      {reviewable && project.latestProposal && (
        <section className="border-line bg-surface shadow-card space-y-5 rounded-2xl border p-5">
          <div>
            <h2 className="font-medium">
              {reviewLabels.reviewTitle}{' '}
              <span className="text-subtle text-sm font-normal">
                v{project.latestProposal.version}
              </span>
            </h2>
            <p className="text-subtle mt-1 text-xs">{reviewLabels.reviewHint}</p>
          </div>
          <ProposalSummary proposal={project.latestProposal} labels={reviewLabels} />
          <div className="border-line border-t pt-5">
            <ProposalReviewForm
              projectId={id}
              proposalId={project.latestProposal.id}
              labels={reviewLabels}
            />
          </div>
        </section>
      )}

      <LifecyclePanel
        projectId={id}
        lifecycle={lifecycle}
        locale={locale}
        labels={lifecycleLabels}
      />

      <ThreadPanel
        problemId={project.problemId}
        returnPath={`/projects/${id}`}
        messages={thread}
        access={threadAccess}
        locale={locale}
        labels={threadLabels}
      />

      {isOwningTeam && (
        <ProjectWorkspace project={project} candidates={candidates} labels={workspaceLabels} />
      )}
    </div>
  );
}
