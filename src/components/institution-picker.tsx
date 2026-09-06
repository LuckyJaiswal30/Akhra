"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export function InstitutionPicker() {
  const universities = useQuery(api.institutions.list);
  const mine = useQuery(api.institutions.myUniversity);
  const setMine = useMutation(api.institutions.setMyUniversity);

  if (!universities || universities.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground">
        Institution
      </span>
      <select
        value={mine?._id ?? ""}
        onChange={(event) =>
          setMine({ universityId: event.target.value as Id<"universities"> })
        }
        className="max-w-48 rounded-md border border-input bg-card px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <option value="" disabled>
          Choose one
        </option>
        {universities.map((u) => (
          <option key={u._id} value={u._id}>
            {u.shortName}
          </option>
        ))}
      </select>
    </label>
  );
}
