# university

What an institution does with a challenge the state has routed to it: respond, form a team,
and write a research proposal.

## Public API

```ts
listRoutedProblems(actor, response?)   // referrals to the actor's institution
createProject(actor, { problemId, title, summary, facultyMentorId? })
addProjectMember
submitProposal(actor, projectId, input)   // versioned, never overwritten
respondToRoutingAction / createProjectAction / addMemberAction / removeMemberAction / submitProposalAction
getProject / listOrganizationProjects / listOrganizationMembers
getInstitutionProfile / updateInstitutionProfile   // domains, disciplines, facilities
setFacultyExpertise(actor, userId, input)           // a faculty member's discipline and specialisation
<ReferralInbox />, <ProjectWorkspace />, <InstitutionProfileForm />, <FacultyExpertiseList />
```

## Design notes

**A project is the unit of work, and it only exists after acceptance.** `createProject` refuses
unless the institution has already accepted the referral. That ordering is what makes the
industry module's guarantee true: everything discoverable there is university-vetted, because a
project cannot exist otherwise.

**Proposals are versioned, not edited.** Revising creates version _n+1_ and leaves the previous
one intact. A funding decision was made against a specific version, so overwriting it would
destroy the record of what was actually agreed.

**A student's rights stop at their own project.** The problem statement asks for multidisciplinary
student and faculty teams, so a student holds an account of their own, invited by the institution's
administrator. They see only the projects they are named on, move their own milestones and add
documents. Answering referrals, forming teams, writing proposals and recording outcomes belong to
faculty and the administrator — `isOwner` in the lifecycle module is false for a student, and
`onTeam` is what they act by. Row-level security draws the line between institutions; inside one
institution this rule is the service layer's.

**A proposal is reviewed before any work starts.** A new project sits in planning. The team may
save drafts and submit; they cannot approve their own proposal, because the submission schema only
accepts `draft` and `submitted`. The district officer for the report's district (or the state desk
and super administrators) approves, asks for a revision or rejects it through `reviewProposal` in
the lifecycle module, and a note is required for anything but approval. Approval moves the project
to `in_progress` in the same transaction. A submitted proposal is locked until it is decided.

**What an institution declares is what routing uses.** The profile page records strength per
domain, academic disciplines and facilities; faculty record their own discipline and
specialisation. These are the signals `scoreInstitution` weighs, so an institution that keeps its
profile current is routed the work it is equipped for.

**Organisation scoping is checked twice.** `requireOrganization` and `assertOwnsProject` raise a
clear error, and RLS independently scopes the rows. The service-layer check exists so a
mistake surfaces as "that project does not belong to your institution" rather than as a write
that silently affects zero rows.

**Accepting a referral moves the problem to `in_progress`** through `transitionProblem` in the
classification module, so the citizen's public tracker updates without this module knowing
anything about how the tracker is rendered.

## Extending it

Team roles live in `project_member_role` (`packages/db/src/schema/enums.ts`). Adding one means
a migration plus a label in both message catalogs — no logic changes here.
