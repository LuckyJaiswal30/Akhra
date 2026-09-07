"use client";

import Link from "next/link";
import { PublicShell, Prose, Section } from "@/components/public-shell";
import { STATUS_LABEL } from "@/lib/jharkhand";

const STEPS: [string, string][] = [
  [
    STATUS_LABEL.submitted,
    "Your report has reached the district office. Nothing has been checked yet.",
  ],
  [
    STATUS_LABEL.validated,
    "The officer has confirmed the problem is real. It can now be given to a university team.",
  ],
  [
    STATUS_LABEL.routed,
    "A college or university has been asked to work on it, chosen by what its departments actually work on.",
  ],
  [
    STATUS_LABEL.accepted,
    "A faculty member and a student team have accepted it.",
  ],
  [
    STATUS_LABEL.in_progress,
    "The team is working on it and recording milestones as they go.",
  ],
  [STATUS_LABEL.solution_proposed, "The team has submitted a plan."],
  [
    STATUS_LABEL.industry_backed,
    "A company or organisation has agreed to help build or fund it.",
  ],
  [
    STATUS_LABEL.deployed,
    "Something has actually been built and put in place. You will get a message when this happens.",
  ],
  [
    STATUS_LABEL.rejected,
    "The officer decided not to take it forward. The reason is shown on your report.",
  ],
];

export default function HelpPage() {
  return (
    <PublicShell>
      <Prose
        title="Help"
        intro="How to report a problem, and what the words on your report mean."
      >
        <Section heading="Reporting a problem">
          <p className="text-muted-foreground">
            You need an account, which takes an email address and nothing else. Once you are signed in, open <Link href="/home" className="font-medium underline underline-offset-4">your workspace</Link> — citizens land straight on the reporting form. You will be asked one thing at a time: a photo, what the problem is about, where it is, and what is wrong in your own words. You can go back at any point.
          </p>
          <p className="text-muted-foreground">
            A photo is the most useful thing you can add. It lets the officer confirm the problem without visiting first.
          </p>
        </Section>

        <Section heading="What the statuses mean">
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b-2 border-border-strong bg-secondary text-left">
                  <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2 font-semibold">What it means</th>
                </tr>
              </thead>
              <tbody>
                {STEPS.map(([status, meaning]) => (
                  <tr key={status} className="border-b border-border last:border-0">
                    <th scope="row" className="w-64 px-4 py-3 text-left font-medium">{status}</th>
                    <td className="px-4 py-3 text-muted-foreground">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section heading="Several people reporting the same thing">
          <p className="text-muted-foreground">
            If your neighbours report the same broken handpump, the system recognises that the reports describe one problem and joins them together. Your report is not lost — it counts towards how many people are affected, which is part of how the problem is prioritised.
          </p>
        </Section>

        <Section heading="Getting officer, faculty, student or partner access">
          <p className="text-muted-foreground">
            You cannot request these roles yourself. An administrator invites the email address of the person concerned, after checking their posting or enrolment. The role is then applied the next time that person signs in. If you need access, ask your department or institution to contact the administrator of this deployment.
          </p>
        </Section>
      </Prose>
    </PublicShell>
  );
}
