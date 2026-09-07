"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import {
  Alert,
  Button,
  Field,
  Input,
  LoadingList,
  Select,
} from "@/components/ui";
import { DISTRICTS } from "@/lib/jharkhand";
import { ROLE_LABEL, type Role } from "@/lib/roles";

type Me = NonNullable<FunctionReturnType<typeof api.users.current>>;

const SUGGESTION: Record<Role, string> = {
  citizen: "Resident",
  officer: "Block Development Officer",
  faculty: "Assistant Professor",
  student: "Final year student",
  industry: "CSR Lead",
  admin: "Programme Manager",
};

/**
 * District and designation are the two things the application needs and the
 * identity provider cannot supply. The same form is used inside Clerk's
 * account modal and inside the dialog that blocks an unfinished profile, so
 * that there is one implementation of the rule and one of the copy.
 */
export function ProfileFields({
  me,
  onSaved,
  submitLabel = "Save",
}: {
  me: Me;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const completeProfile = useMutation(api.users.completeProfile);

  const [district, setDistrict] = useState(me.district ?? "");
  const [designation, setDesignation] = useState(me.designation ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);

  const role = me.role as Role;
  const districtLocked = role === "officer" && Boolean(me.district);
  const dirty =
    district !== (me.district ?? "") || designation !== (me.designation ?? "");
  const missingDistrict = !district;
  const missingDesignation = designation.trim().length < 2;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setTouched(true);
        setError(null);
        setSaved(false);
        if (missingDistrict || missingDesignation) return;

        setBusy(true);
        try {
          await completeProfile({ district, designation });
          setSaved(true);
          onSaved?.();
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Could not save that.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field
        label="District"
        required
        hint={
          districtLocked
            ? "An administrator sets the district an officer is posted in."
            : "The Jharkhand district this account belongs to. It decides which officer sees what you report."
        }
        error={touched && missingDistrict ? "Choose a district." : undefined}
      >
        {(props) => (
          <Select
            {...props}
            value={district}
            disabled={districtLocked}
            onChange={(event) => setDistrict(event.target.value)}
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

      <Field
        label="Designation"
        required
        hint="How you would introduce yourself here."
        error={
          touched && missingDesignation
            ? "Add a couple of words at least."
            : undefined
        }
      >
        {(props) => (
          <Input
            {...props}
            value={designation}
            maxLength={80}
            placeholder={SUGGESTION[role]}
            onChange={(event) => setDesignation(event.target.value)}
          />
        )}
      </Field>

      {error && <Alert tone="danger">{error}</Alert>}
      {saved && !dirty && <Alert tone="success">Saved.</Alert>}

      <Button type="submit" loading={busy} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}

/**
 * The page Clerk mounts inside its own account modal, so that district and
 * designation sit next to the rest of a person's details rather than on a
 * screen of their own.
 */
export function AkhraProfilePage() {
  const me = useQuery(api.users.current);

  if (me === undefined) return <LoadingList rows={2} />;
  if (me === null) {
    return (
      <Alert tone="warning">
        Your account is still being set up. Reload in a moment.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">District &amp; designation</h1>
        <p className="text-base text-muted-foreground">
          Where you are and what you do. You are a{" "}
          {ROLE_LABEL[me.role as Role]} — roles are handed out by an
          administrator against your email address, never chosen here.
        </p>
      </div>

      {!me.profileComplete && (
        <Alert tone="warning" title="Not complete yet">
          Both of these are needed before you can use the rest of Akhra.
        </Alert>
      )}

      <ProfileFields me={me} submitLabel="Save changes" />
    </div>
  );
}

export function AkhraProfileIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        d="M8 1.5 2.5 4v3.8c0 3.2 2.3 6 5.5 6.7 3.2-.7 5.5-3.5 5.5-6.7V4L8 1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
