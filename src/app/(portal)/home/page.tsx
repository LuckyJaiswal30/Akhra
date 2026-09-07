"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { LoadingList, Page } from "@/components/ui";
import { ROLE_HOME, type Role } from "@/lib/roles";

export default function HomeRedirect() {
  const me = useQuery(api.users.current);
  const router = useRouter();
  const role = me?.role as Role | undefined;

  useEffect(() => {
    if (!role) return;
    router.replace(ROLE_HOME[role] ?? "/dashboard");
  }, [role, router]);

  return (
    <Page width="column" aria-busy="true" aria-live="polite">
      <p className="text-base text-muted-foreground" role="status">
        Taking you to your workspace&hellip;
      </p>
      <LoadingList rows={1} />
    </Page>
  );
}
