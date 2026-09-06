"use client";

import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { EmptyState, LoadingList } from "@/components/ui";
import { ROLE_LABEL, type Role } from "@/lib/roles";

export function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const me = useQuery(api.users.current);

  if (me === undefined) return <LoadingList rows={2} />;

  if (!me || !allow.includes(me.role as Role)) {
    return (
      <EmptyState
        title="This page is not for your role"
        description={`Only ${allow
          .map((r) => ROLE_LABEL[r])
          .join(" and ")} accounts can open this page.`}
      />
    );
  }

  return <>{children}</>;
}
