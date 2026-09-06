"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export function PartnerPicker() {
  const partners = useQuery(api.partners.list);
  const mine = useQuery(api.partners.mine);
  const setMine = useMutation(api.partners.setMyPartner);

  if (!partners || partners.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground">
        Organisation
      </span>
      <select
        value={mine?._id ?? ""}
        onChange={(event) =>
          setMine({ partnerId: event.target.value as Id<"partners"> })
        }
        className="max-w-48 rounded-md border border-input bg-card px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <option value="" disabled>
          Choose one
        </option>
        {partners.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
