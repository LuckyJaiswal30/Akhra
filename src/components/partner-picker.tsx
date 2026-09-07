"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export function PartnerPicker() {
  const options = useQuery(api.partners.list);
  const mine = useQuery(api.partners.mine);
  const setMine = useMutation(api.partners.setMyPartner);
  const [problem, setProblem] = useState<string | null>(null);

  if (!options || options.length === 0) return null;

  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Organisation</span>
        <select
          value={mine?._id ?? ""}
          onChange={async (event) => {
            setProblem(null);
            try {
              await setMine({
                partnerId: event.target.value as Id<"partners">,
              });
            } catch (cause) {
              setProblem(
                cause instanceof Error ? cause.message : "Could not save that.",
              );
            }
          }}
          className="h-9 max-w-48 rounded-sm border border-input bg-card px-2 text-sm"
        >
          <option value="" disabled>
            Choose one
          </option>
          {options.map((option) => (
            <option key={option._id} value={option._id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      {problem && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {problem}
        </p>
      )}
    </div>
  );
}
