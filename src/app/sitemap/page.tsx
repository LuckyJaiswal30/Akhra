"use client";

import Link from "next/link";
import { PublicShell, Prose, Section } from "@/components/public-shell";

const MAP: { heading: string; items: [string, string, string][] }[] = [
  {
    heading: "Public",
    items: [
      ["/", "Home", "What Akhra is, and what happens after you report something"],
      ["/help", "Help", "How to report something, and what each status means"],
      ["/accessibility", "Accessibility", "Our conformance statement and screen reader guidance"],
      ["/privacy", "Privacy", "What is stored and who can see it"],
      ["/sign-in", "Sign in", "For people who already have an account"],
      ["/sign-up", "Make an account", "Everyone starts out as a citizen"],
    ],
  },
  {
    heading: "For citizens",
    items: [
      ["/report", "Report a problem", "Six questions, one at a time"],
      ["/my-reports", "My reports", "Everything you sent in, and where it got to"],
      ["/notifications", "Updates", "News about your reports and projects"],
    ],
  },
  {
    heading: "For government officers",
    items: [["/queue", "Reports to check", "Waiting on you in your district"]],
  },
  {
    heading: "For universities",
    items: [
      ["/challenges", "Open challenges", "Problems sent to your institution"],
      ["/projects", "Our projects", "Teams, plans and milestones"],
    ],
  },
  {
    heading: "For industry partners",
    items: [
      ["/proposals", "Proposals", "University plans looking for backing"],
      ["/pledges", "What we backed", "What your organisation put its name to"],
    ],
  },
  {
    heading: "Monitoring and access",
    items: [
      ["/dashboard", "How it is going", "What has been reported and dealt with, by district"],
      ["/administration", "Access", "Who has what role, and who gave it to them"],
    ],
  },
];

export default function SitemapPage() {
  return (
    <PublicShell>
      <Prose
        title="Site map"
        wide
        intro="Every page on Akhra. Anything below the public section needs you to be signed in, and some pages only open for a particular role."
      >
        {MAP.map((group) => (
          <Section key={group.heading} heading={group.heading}>
            <ul className="grid gap-x-8 border-t border-border sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map(([href, label, description]) => (
                <li key={href} className="border-b border-border py-4">
                  <Link
                    href={href}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {label}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </Prose>
    </PublicShell>
  );
}
