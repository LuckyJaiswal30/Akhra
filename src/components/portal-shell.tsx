"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { NAV, ROLE_LABEL, type Role } from "@/lib/roles";
import { RoleSwitcher } from "@/components/role-switcher";
import { DEMO_MODE } from "@/lib/flags";
import { InstitutionPicker } from "@/components/institution-picker";
import { PartnerPicker } from "@/components/partner-picker";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/mark";

export function PortalShell({ children }: { children: ReactNode }) {
  const me = useQuery(api.users.current);
  const unread = useQuery(api.users.unreadNotificationCount);
  const pathname = usePathname();

  const role = me?.role as Role | undefined;
  const items = role ? NAV.filter((item) => item.roles.includes(role)) : [];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <Link href="/home" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Wordmark />
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/notifications"
              className="rounded-full px-2 py-0.5 font-mono text-[0.7rem] transition-colors"
              style={
                typeof unread === "number" && unread > 0
                  ? undefined
                  : { color: "var(--muted-foreground)" }
              }
            >
              {typeof unread === "number" && unread > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                  {unread} new
                </span>
              ) : (
                "Notifications"
              )}
            </Link>
            {(role === "faculty" || role === "student") && (
              <InstitutionPicker />
            )}
            {role === "industry" && <PartnerPicker />}
            {DEMO_MODE && role && <RoleSwitcher current={role} />}
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {me === undefined ? (
          <p className="font-mono text-sm text-muted-foreground">Loading…</p>
        ) : me === null ? (
          <p className="text-sm text-muted-foreground">
            Setting up your account. Refresh in a moment if this does not clear.
          </p>
        ) : (
          children
        )}
      </main>

      <footer className="border-t border-border px-6 py-4">
        <p className="mx-auto w-full max-w-6xl font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">
          Akhra · SIH problem statement 43 · signed in as{" "}
          {role ? ROLE_LABEL[role] : "…"}
        </p>
      </footer>
    </div>
  );
}
