"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export function UserBootstrap() {
  const { user, isLoaded } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (!isLoaded || !user) return;
    ensureUser({
      name: user.fullName ?? user.username ?? "Unnamed",
      email: user.primaryEmailAddress?.emailAddress ?? "",
    }).catch(() => {});
  }, [isLoaded, user, ensureUser]);

  return null;
}
