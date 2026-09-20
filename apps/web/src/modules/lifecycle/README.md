# lifecycle

Everything that happens to a project after a team forms: milestones, deliverables, stage
changes from prototype to deployment, and the outcomes that justify the whole pipeline.

## Public API

```ts
getLifecycle(actor, projectId)          // milestones, documents, outcomes + what this viewer may do
createMilestone / updateMilestoneStatus
advanceProjectAction(prev, formData)    // stage changes go through the action
recordDocument(actor, projectId, file) / canAccessDocument(actor, storageKey)
recordOutcome(actor, projectId, input)  // patent, startup, publication, deployment, policy, product
recordTest(actor, projectId, input)     // a field or lab test and its result
listProposalsForReview(actor) / reviewProposal(actor, proposalId, decision, note?)
<LifecyclePanel />, <ProposalReviewForm />, <ProposalSummary />
```

## Design notes

**Two status machines, both tables.** Problem stages come from `TRANSITIONS` in
`packages/shared/src/status-machine.ts`. Milestones use `MILESTONE_TRANSITIONS` in
`service.ts`: the team moves a milestone `pending → in_progress → submitted`; only the state
moves it `submitted → approved | rejected`. The UI renders buttons from the same tables, so a
button that appears is a button that will work.

**Project and problem stay in lockstep.** `advanceProject` runs the problem transition first,
because that is the one checked against the shared status machine and the one the citizen sees,
then updates the project row. The citizen tracker therefore reflects prototypes, pilots and
deployments with no code in the citizen module.

**Oversight follows the district.** The officer for the report's district, the state desk and super
administrators oversee a project: they review proposals and approve milestones. Another district's
officer cannot, and RLS (`akhra_oversees_project`, migration 0020) holds that line even if a service
check is missed. Project writes are limited to the team and those overseers.

**Testing and intellectual property are recorded, not inferred.** Each test names what was tested,
where, and whether it passed, failed or was inconclusive; tests can only be recorded while work is
underway. A patent outcome carries its filing reference and status (filed, published, granted), and
a check constraint keeps the IP status on patents only, so the dashboard's patent count means patents.

**Documents are private to the work.** RLS on `documents` limits visibility to the owning
institution, team members, accepted industry partners and the state. The local file route
additionally calls `canAccessDocument` for any key under `projects/`, so knowing a storage key
is not enough to download it.

Known limitation: with `FILE_STORAGE_DRIVER=blob`, files are stored with Vercel Blob public
access, so the URL itself is the credential. A production deployment holding sensitive
documents should switch to private blobs with short-lived signed URLs.

## Extending it

New outcome types need an enum value (`outcome_type`), an entry in `OUTCOME_TYPES`, and a label
in both catalogs. The analytics module counts outcomes by type, so a new type appears on the
dashboard automatically.
