"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Alert,
  Aside,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  EmptyState,
  Field,
  Input,
  LoadingList,
  Page,
  PageHeader,
  Select,
  Split,
  TabPanel,
  Tabs,
  Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/datetime";
import { DISTRICTS } from "@/lib/jharkhand";
import {
  INVITABLE_ROLES,
  ROLES,
  ROLE_EVIDENCE,
  ROLE_LABEL,
  type InvitableRole,
  type Role,
} from "@/lib/roles";

const TABS = [
  { value: "invite" as const, label: "Give someone access" },
  { value: "pending" as const, label: "Waiting to be used" },
  { value: "directory" as const, label: "Everyone" },
];

type Tab = (typeof TABS)[number]["value"];

export default function AdministrationPage() {
  const me = useQuery(api.users.current);
  const adminExists = useQuery(api.access.adminExists);

  if (me === undefined || adminExists === undefined) {
    return (
      <Page aria-busy="true" aria-live="polite">
        <LoadingList rows={2} />
      </Page>
    );
  }

  if (me?.role !== "admin") {
    return adminExists ? (
      <Page width="reading">
        <EmptyState
          title="This page is for administrators"
          description="Only an administrator can hand out access. If you need officer, university or company access, ask them to add your email address."
        />
      </Page>
    ) : (
      <BootstrapAdmin />
    );
  }

  return <Administration />;
}

function BootstrapAdmin() {
  const claim = useMutation(api.access.claimFirstAdmin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Page width="reading">
      <PageHeader
        title="Set up the first administrator"
        description="Nobody runs this deployment yet. Only the account named in BOOTSTRAP_ADMIN_EMAIL on the backend can claim it, and only while there is no administrator."
      />
      <Card>
        <CardBody className="flex flex-col gap-4">
          <p className="text-base text-muted-foreground">
            After this, every other role is handed out from this screen. Nobody
            — including you — can raise their own access from inside the app.
          </p>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button
            className="self-start"
            loading={busy}
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                await claim({});
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Could not claim it.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Claim administrator access
          </Button>
        </CardBody>
      </Card>
    </Page>
  );
}

function Administration() {
  const [tab, setTab] = useState<Tab>("invite");
  const pending = useQuery(api.access.invitations);
  const people = useQuery(api.access.directory);

  return (
    <Page>
      <PageHeader
        title="Who can do what"
        description="Every role above citizen is handed out here, by a person, and written to the audit log. Nobody can promote themselves."
      />

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        label="Access sections"
        idPrefix="access"
        counts={{
          pending: pending?.length ?? 0,
          directory: people?.length ?? 0,
        }}
      />

      <TabPanel idPrefix="access" value={tab}>
        {tab === "invite" ? (
          <InviteForm />
        ) : tab === "pending" ? (
          pending === undefined ? (
            <LoadingList rows={2} />
          ) : (
            <PendingInvitations rows={pending} />
          )
        ) : people === undefined ? (
          <LoadingList rows={3} />
        ) : (
          <Directory people={people} />
        )}
      </TabPanel>
    </Page>
  );
}

function InviteForm() {
  const invite = useMutation(api.access.invite);
  const universities = useQuery(api.institutions.list);
  const partners = useQuery(api.partners.list);

  const [email, setEmail] = useState("");
  const [invitedRole, setInvitedRole] = useState<InvitableRole>("officer");
  const [universityId, setUniversityId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [district, setDistrict] = useState("");
  const [designation, setDesignation] = useState("");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    const sentTo = email.trim();
    try {
      const outcome = await invite({
        email: sentTo,
        invitedRole,
        universityId: universityId
          ? (universityId as Id<"universities">)
          : undefined,
        partnerId: partnerId ? (partnerId as Id<"partners">) : undefined,
        district: district || undefined,
        designation: designation.trim() || undefined,
        note: note.trim() || undefined,
      });
      setResult(
        outcome.applied
          ? `${sentTo} already has an account, so this is live right now.`
          : `Saved. ${sentTo} gets this the moment they sign in with that address.`,
      );
      setEmail("");
      setDesignation("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Split>
      <Card>
        <form onSubmit={submit} noValidate>
          <CardBody className="flex flex-col gap-5">
            <Field
              label="Email address"
              required
              hint="Has to match the address they sign up with."
            >
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@department.jharkhand.gov.in"
                />
              )}
            </Field>

            <Field label="Role" required>
              {(props) => (
                <Select
                  {...props}
                  value={invitedRole}
                  onChange={(e) => {
                    setInvitedRole(e.target.value as InvitableRole);
                    setUniversityId("");
                    setPartnerId("");
                    setDistrict("");
                  }}
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {invitedRole === "officer" && (
              <Field label="District" required>
                {(props) => (
                  <Select
                    {...props}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  >
                    <option value="">Choose a district</option>
                    {DISTRICTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            {(invitedRole === "faculty" || invitedRole === "student") && (
              <Field label="Institution" required>
                {(props) => (
                  <Select
                    {...props}
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    disabled={universities === undefined}
                  >
                    <option value="">
                      {universities === undefined
                        ? "Loading institutions…"
                        : "Choose an institution"}
                    </option>
                    {(universities ?? []).map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            {invitedRole === "industry" && (
              <Field label="Organisation" required>
                {(props) => (
                  <Select
                    {...props}
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    disabled={partners === undefined}
                  >
                    <option value="">
                      {partners === undefined
                        ? "Loading organisations…"
                        : "Choose an organisation"}
                    </option>
                    {(partners ?? []).map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            <Field label="Designation" hint="Optional. Shown next to their name.">
              {(props) => (
                <Input
                  {...props}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Block Development Officer"
                />
              )}
            </Field>

            <Field
              label="Note"
              hint="Optional. For your own record of why you gave them this."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
            </Field>

            {error && <Alert tone="danger">{error}</Alert>}
            {result && <Alert tone="success">{result}</Alert>}
          </CardBody>

          <CardFooter>
            <Button type="submit" loading={busy}>
              Give access
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Aside>
        <h2 className="text-base font-semibold">How this works</h2>
        <p className="text-base text-muted-foreground">
          Use the email address they will actually sign in with. The role
          switches on by itself the first time they sign in — they never fill in
          a request form and never pick their own role.
        </p>
        <p className="text-base text-muted-foreground">
          {ROLE_EVIDENCE[invitedRole]}
        </p>
        <p className="text-base text-muted-foreground">
          Everything you hand out here is written to the audit log against your
          name. Withdraw anything unused from the next tab.
        </p>
      </Aside>
    </Split>
  );
}

type Invitation = FunctionReturnType<typeof api.access.invitations>[number];

function PendingInvitations({ rows }: { rows: Invitation[] }) {
  const revoke = useMutation(api.access.revokeInvitation);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing waiting"
        description="Everything you have handed out has been used or withdrawn."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {rows.map((row) => (
        <Card key={row._id}>
          <CardBody className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{row.email}</p>
              <p className="mt-1 text-base text-muted-foreground">
                {ROLE_LABEL[row.role as Role]}
                {row.organisation ? ` · ${row.organisation}` : ""}
                {row.district ? ` · ${row.district}` : ""}
                {row.designation ? ` · ${row.designation}` : ""}
              </p>
              {row.note && (
                <p className="mt-2 text-base text-muted-foreground">{row.note}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Issued by {row.invitedByName} on {formatDate(row.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge tone="warning">Waiting for them to sign in</Badge>
              <Button
                variant="secondary"
                size="sm"
                loading={busy === row._id}
                onClick={async () => {
                  setError(null);
                  setBusy(row._id);
                  try {
                    await revoke({ invitationId: row._id });
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not withdraw that.",
                    );
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Revoke
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

type Person = FunctionReturnType<typeof api.access.directory>[number];

function Directory({ people }: { people: Person[] }) {
  const assignRole = useMutation(api.access.assignRole);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Role>("citizen");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needle = filter.trim().toLowerCase();
  const rows = needle
    ? people.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.email.toLowerCase().includes(needle) ||
          ROLE_LABEL[p.role as Role].toLowerCase().includes(needle),
      )
    : people;

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search by name, email or role"
        aria-label="Search people"
        className="max-w-sm"
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {rows.length === 0 ? (
        <EmptyState
          title="Nobody matches that"
          description="Try part of a name, an email address, or a role."
        />
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[34rem] text-base">
            <caption className="sr-only">
              Everyone with an account, and the role each currently holds
            </caption>
            <thead>
              <tr className="border-b-2 border-border-strong bg-secondary text-left">
                <Th>Person</Th>
                <Th>Designation</Th>
                <Th>Institution or district</Th>
                <Th>Role</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr
                  key={person._id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{person.name}</p>
                    <p className="text-sm break-all text-muted-foreground">
                      {person.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {person.designation ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {person.organisation ?? person.district ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {editing === person._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          aria-label={`Role for ${person.name}`}
                          value={draft}
                          className="w-44"
                          disabled={busy === person._id}
                          onChange={(event) =>
                            setDraft(event.target.value as Role)
                          }
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          loading={busy === person._id}
                          onClick={async () => {
                            if (draft === person.role) {
                              setEditing(null);
                              return;
                            }
                            setError(null);
                            setBusy(person._id);
                            try {
                              await assignRole({
                                userId: person._id as Id<"users">,
                                nextRole: draft,
                              });
                              setEditing(null);
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Could not change that role.",
                              );
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === person._id}
                          onClick={() => {
                            setEditing(null);
                            setError(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <span>{ROLE_LABEL[person.role as Role]}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(person.role as Role);
                            setEditing(person._id);
                            setError(null);
                          }}
                          className="shrink-0 text-sm font-medium text-primary underline underline-offset-2"
                        >
                          Change
                          <span className="sr-only"> the role for {person.name}</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-2 text-base font-semibold">
      {children}
    </th>
  );
}
