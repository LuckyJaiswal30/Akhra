"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ROLE_HOME, type Role } from "@/lib/roles";

export default function HomeRedirect() {
  const me = useQuery(api.users.current);
  const router = useRouter();

  useEffect(() => {
    if (!me) return;
    router.replace(ROLE_HOME[me.role as Role]);
  }, [me, router]);

  return (
    <p className="font-mono text-sm text-muted-foreground">
      Taking you to your workspace…
    </p>
  );
}
