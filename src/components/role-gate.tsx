"use client";

import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card } from "@/components/kit";
import { ROLE_LABEL, type Role } from "@/lib/roles";

export function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const me = useQuery(api.users.current);

  if (me === undefined) {
    return (
      <p className="font-mono text-sm text-muted-foreground">Loading…</p>
    );
  }

  if (!me || !allow.includes(me.role as Role)) {
    return (
      <Card className="flex flex-col gap-2">
        <h1 className="text-lg font-bold">This page is not for your role</h1>
        <p className="text-sm text-muted-foreground">
          Only {allow.map((r) => ROLE_LABEL[r]).join(" and ")} accounts can open
          this. Use the Demo role dropdown in the header to switch.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
