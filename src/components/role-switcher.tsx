"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { ROLES, ROLE_HOME, ROLE_LABEL, type Role } from "@/lib/roles";

export function RoleSwitcher({ current }: { current: Role }) {
  const setRole = useMutation(api.users.setRole);
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground">
        Demo role
      </span>
      <select
        value={current}
        onChange={async (event) => {
          const next = event.target.value as Role;
          await setRole({ role: next });
          router.push(ROLE_HOME[next]);
          router.refresh();
        }}
        className="rounded-md border border-input bg-card px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
