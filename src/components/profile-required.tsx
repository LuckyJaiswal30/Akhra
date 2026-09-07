"use client";

import { useEffect, useId, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ProfileFields } from "@/components/akhra-profile";

/**
 * A profile without a district and a designation cannot be acted on — the
 * server refuses to file a report or rule on one — so the gap is closed
 * before anything else, in front of whatever page the person happened to
 * land on. There is deliberately no way to dismiss this: no close control,
 * no escape key, no click-away. The only exit is filling it in.
 */
export function ProfileRequired() {
  const me = useQuery(api.users.current);
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const blocking = Boolean(me && !me.profileComplete);

  useEffect(() => {
    if (!blocking) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function keepFocusInside(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;

      const focusable = dialog.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!dialog.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    dialog.current
      ?.querySelector<HTMLElement>("select, input, textarea, button")
      ?.focus();

    document.addEventListener("keydown", keepFocusInside, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keepFocusInside, true);
    };
  }, [blocking]);

  if (!blocking || !me) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[2px]">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="my-auto w-full max-w-[30rem] rounded-md border border-border bg-card p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          {me.name ? `One moment, ${me.name.split(" ")[0]}` : "One moment"}
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Two things we need before you can use Akhra. You can change them
          later from <strong className="font-medium">Manage account</strong>.
        </p>

        <div className="mt-6">
          <ProfileFields me={me} submitLabel="Save and continue" />
        </div>
      </div>
    </div>
  );
}
