"use client";

import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { EmptyState, LoadingList, Page } from "@/components/ui";
import { ROLE_LABEL, type Role } from "@/lib/roles";

function readable(roles: Role[]) {
  const labels = roles.map((role) => ROLE_LABEL[role]);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

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
      <Page width="column" aria-busy="true" aria-live="polite">
        <LoadingList rows={2} />
      </Page>
    );
  }

  if (!me || !allow.includes(me.role as Role)) {
    return (
      <Page width="column">
        <EmptyState
          title="This page is not for your role"
          description={`Only ${readable(allow)} accounts can open this page. Your account is ${
            me ? ROLE_LABEL[me.role as Role] : "not set up"
          }.`}
        />
      </Page>
    );
  }

  return <>{children}</>;
}
