"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { NAV, ROLE_LABEL, type Role } from "@/lib/roles";
import { InstitutionPicker } from "@/components/institution-picker";
import { PartnerPicker } from "@/components/partner-picker";
import { SkipLink, Wordmark } from "@/components/site-chrome";
import { LoadingList, Page } from "@/components/ui";
import {
  AkhraProfileIcon,
  AkhraProfilePage,
} from "@/components/akhra-profile";
import { ProfileRequired } from "@/components/profile-required";
import { cn } from "@/lib/utils";

export function PortalShell({ children }: { children: ReactNode }) {
  const me = useQuery(api.users.current);
  const unread = useQuery(api.users.unreadNotificationCount);
  const pathname = usePathname();

  const role = me?.role as Role | undefined;
  const items = role ? NAV.filter((item) => item.roles.includes(role)) : [];
  const incomplete = Boolean(me && !me.profileComplete);

  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />

      <header
        aria-hidden={incomplete ? true : undefined}
        className="border-b border-border bg-card"
      >
        <div className="mx-auto flex w-full max-w-page flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <Link href="/home" className="rounded-sm">
            <Wordmark />
          </Link>

          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 max-sm:w-full max-sm:justify-end">
            {(role === "faculty" || role === "student") && <InstitutionPicker />}
            {role === "industry" && <PartnerPicker />}

            <Link
              href="/notifications"
              className="flex min-h-11 items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
            >
              Updates
              {typeof unread === "number" && unread > 0 && (
                <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular">
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>

            <div className="flex items-center gap-3 border-l border-border pl-5">
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-sm font-medium text-foreground">
                  {me?.name ?? "…"}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {role ? ROLE_LABEL[role] : "…"}
                  {me?.district ? ` · ${me.district}` : ""}
                </span>
              </span>
              <UserButton>
                <UserButton.UserProfilePage label="account" />
                <UserButton.UserProfilePage
                  label="District & designation"
                  url="district"
                  labelIcon={<AkhraProfileIcon />}
                >
                  <AkhraProfilePage />
                </UserButton.UserProfilePage>
                <UserButton.UserProfilePage label="security" />
              </UserButton>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <nav aria-label="Sections" className="border-t border-border">
            <div className="mx-auto w-full max-w-page px-4 sm:px-6">
              <div className="-mx-3 flex flex-wrap gap-x-1">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 text-base whitespace-nowrap transition-colors",
                      active
                        ? "border-primary font-semibold text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              </div>
            </div>
          </nav>
        )}
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6 lg:py-12"
      >
        {me === undefined ? (
          <Page width="column" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading</span>
            <LoadingList rows={2} />
          </Page>
        ) : me === null ? (
          <Page width="column">
            <p className="text-base text-muted-foreground" role="status">
              Setting up your account&hellip;
            </p>
            <LoadingList rows={1} />
          </Page>
        ) : incomplete ? (
          <Page width="column" aria-hidden="true">
            <LoadingList rows={2} />
          </Page>
        ) : (
          children
        )}
      </main>

      <ProfileRequired />
    </div>
  );
}
