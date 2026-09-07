"use client";

import { PublicShell, Prose, Section } from "@/components/public-shell";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <Prose
        title="Privacy"
        intro="What Akhra stores about you, who can see it, and what never leaves the system."
      >
        <Section heading="What we store">
          <p className="text-muted-foreground">
            Your name and email address, which come from the account you sign in with. The reports you submit: the text, any photos, the district, and a location. Nothing else. We do not ask for, and do not store, your Aadhaar number, any government identity number, or any payment detail.
          </p>
        </Section>

        <Section heading="Who can see your exact location">
          <p className="text-muted-foreground">
            Only the government officer verifying your report. Everyone else — universities, industry partners, and anyone reading the public monitoring tables — sees the district and a location deliberately blurred to roughly five hundred metres. That blurring is applied on the server, so the precise coordinate is never sent to those screens at all.
          </p>
        </Section>

        <Section heading="What is sent to an AI model">
          <p className="text-muted-foreground">
            The text of your report and the district name, so the system can work out what kind of problem it is and whether somebody has already reported the same thing. Your name, your email address, your exact location and your photographs are never included in what is sent to a model.
          </p>
        </Section>

        <Section heading="Photographs">
          <p className="text-muted-foreground">
            Photos are stored privately and served through short-lived links generated for each viewer. They are never placed in a public bucket and cannot be reached by guessing a URL.
          </p>
        </Section>

        <Section heading="Decisions are recorded">
          <p className="text-muted-foreground">
            When an officer verifies, rejects or routes a report, that decision is written to an append-only audit log in the same operation that makes the change, along with who made it and when. This exists so that decisions about a citizen&rsquo;s report can be accounted for later.
          </p>
        </Section>

        <Section heading="This is a prototype">
          <p className="text-muted-foreground">
            Akhra is a student project built for Smart India Hackathon problem statement 43. It is not an official service of the Government of Jharkhand. Do not use it to report an emergency — call 100 for police, 102 for an ambulance, or 101 for fire.
          </p>
        </Section>
      </Prose>
    </PublicShell>
  );
}
