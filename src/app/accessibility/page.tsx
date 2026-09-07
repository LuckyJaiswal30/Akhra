"use client";

import { PublicShell, Prose, Section } from "@/components/public-shell";

const READERS = [
  ["NVDA", "https://www.nvaccess.org/download/", "Free"],
  ["Windows Narrator", "https://support.microsoft.com/windows/complete-guide-to-narrator-e4397a0d-ef4f-b386-d8ae-c172f109bdb1", "Built into Windows"],
  ["VoiceOver", "https://support.apple.com/guide/voiceover/welcome/mac", "Built into macOS and iOS"],
  ["TalkBack", "https://support.google.com/accessibility/android/answer/6283677", "Built into Android"],
  ["JAWS", "https://www.freedomscientific.com/products/software/jaws/", "Commercial"],
];

export default function AccessibilityPage() {
  return (
    <PublicShell>
      <Prose
        title="Accessibility"
        intro="We are aiming at WCAG 2.1 Level AA, the standard Indian government sites have to meet under GIGW 3.0. If any part of this is hard for you to use, please tell us."
      >
        <Section heading="What we have done">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>Every page can be reached and operated with a keyboard alone, and a &ldquo;skip to main content&rdquo; link appears when you press Tab.</li>
            <li>You can zoom to 200% in your browser without anything being cut off or overlapping.</li>
            <li>Colour is never the only signal. Every status has a word on it too.</li>
            <li>Text meets a contrast ratio of at least 4.5 to 1 against its background, and the outline of every button, input and dropdown meets 3 to 1.</li>
            <li>Form fields have visible labels tied to the field, and errors are described in words rather than colour alone, and read out by screen readers when they appear.</li>
            <li>The page language is declared in the markup, so screen readers pronounce it correctly, and every page has its own title.</li>
            <li>Tabbed sections are operated with the arrow keys, as a screen reader user expects.</li>
            <li>Dates and times are shown in India Standard Time, whichever machine drew the page.</li>
          </ul>
        </Section>

        <Section heading="Screen reader access">
          <p className="text-muted-foreground">
            We have checked the site with these screen readers. All of them can read the whole thing.
          </p>
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b-2 border-border-strong bg-secondary text-left">
                  <th scope="col" className="px-4 py-2 font-semibold">Screen reader</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Availability</th>
                </tr>
              </thead>
              <tbody>
                {READERS.map(([name, href, cost]) => (
                  <tr key={name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <a href={href} className="font-medium underline underline-offset-4" target="_blank" rel="noreferrer noopener">
                        {name}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section heading="Known limitations">
          <p className="text-muted-foreground">
            This is a working prototype built by students. Screens outside the citizen reporting flow — the officer verification queue, the university project screens and the monitoring tables — have been checked for keyboard access and contrast but not yet tested with users who rely on assistive technology. Maps are described in text; there is no audio description of imagery yet.
          </p>
        </Section>
      </Prose>
    </PublicShell>
  );
}
