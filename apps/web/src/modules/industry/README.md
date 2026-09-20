# industry

Discovery and partnership: how a company, startup, MSME or CSR arm finds university work worth
backing, and how that offer is accepted.

## Public API

```ts
listDiscoverableProjects(actor, filter?)   // university-vetted work only
expressInterest(actor, projectId, { offerTypes, fundingAmount?, message })
respondToInterest(actor, interestId, status, note?)
listOwnInterests(actor)        // offers this partner has made
listIncomingInterests(actor)   // offers on this university's projects
<ProjectDiscovery />, <IncomingOffers />
```

## Design notes

**Only projects are discoverable, never raw reports.** A project exists only because an
institution accepted a referral and formed a team, so a partner browsing here is always looking
at work that has already been validated by the state and taken up by a university. That is the
whole value of the ordering — it is enforced by `createProject`, not by a filter here.

**Who may do what to an offer is asymmetric,** and `respondToInterest` encodes it directly:
withdrawal belongs to the offering partner, accept and decline belong to the university that
owns the project. Both paths run through one function so the rule is in one readable place.

**Partners say what kind of partner they are.** An industry organisation is a startup, MSME,
corporate, CSR foundation, research lab or innovation hub, set at onboarding; a check constraint
keeps that on industry organisations only. The dashboard counts partnerships by kind.

**An offer is decided once.** An accepted or declined offer cannot be flipped, and no offer can be
made on, or accepted for, a project that has finished or been abandoned.

**Expressing interest is an upsert.** A partner revising their offer updates it rather than
creating a second one, enforced by a unique constraint on (project, organisation).

**Accepting an offer writes a public status event,** so the citizen who reported the original
problem sees that an industry partner has joined — closing the loop back to where it started.

## Extending it

Offer types live in `OFFER_TYPES` (`packages/shared/src/schemas.ts`) and a matching Postgres
enum. Adding one is a migration, a constant, and a label in both catalogs. Offers cover
mentorship, funding, prototyping, data access, deployment, internships, co-development, testing
and technology transfer.
