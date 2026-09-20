# notifications

How people hear about what happened: the in-app notification centre, email, and the message
thread each problem carries between reporter, university, industry and state.

## Public API

```ts
notifyUsers(userIds, input)                      // in-app, plus email when input.email
notifyOrganizations(orgIds, roles, input)
notifyDistrictOfficers(districtCode, input)      // the district's officer, or the state desk if vacant
notifyEscalation(districtCode, input)            // district officer, state desk and super administrators
notifyReporter(problemId, status, note?)         // called for every public status change
notifyEmail(address, input)                      // people without an account
listNotifications / unreadCount / markRead
listThread / getThreadAccess / postMessageAction
<ThreadPanel />
```

## Design notes

**A notification can never undo the action that caused it.** Every `notify*` function catches
and logs its own failures. A broken mail provider costs an email, not a validation or an offer.

**Email is sent after the response, and always through the outbox.** Each message is written to
`email_outbox` first, then handed to the driver chosen by `MAIL_DRIVER` inside Next's `after()`,
so a slow provider adds no latency. The console driver in development and Resend in production
follow the same path, so switching drivers changes delivery, not behaviour. A failed send stays
in the outbox with its error and attempt count; nothing is silently dropped.

**The reporter hears about every public change.** `transitionProblem` in the classification
module calls `notifyReporter`, so every module that moves a problem's status — validation,
routing, project stages — reaches the citizen without knowing this module exists. An email left
on the report form is preferred over the account address so nobody gets the same email twice.

**Routine work stays in the district; trouble reaches the state.** `notifyDistrictOfficers` tells
the report's own district officer, falling back to the state desk only while that post is vacant, so
thirty officers are not told about one district's report. `notifyEscalation` adds the state desk and
the super administrators, for things that should not wait on one person.

**Who hears what is decided by the event, not the viewer.** Recipient lookups run as the database
owner because a university notifying the state must find users it cannot otherwise see. They
return ids and addresses only.

**Threads have two audiences.** Public messages are visible to everyone who can see the problem,
including the citizen on the public tracker. Internal notes are visible only to the owning
institution and the state — enforced by the `messages_select` RLS policy, not by the UI.

## Extending it

Notification links are in-app paths, and the open-and-redirect route only follows paths starting
with a single `/`, so a stored link cannot become an open redirect. Email bodies are plain
English text for now; the message catalogs are the place to add Hindi and Santali templates.
