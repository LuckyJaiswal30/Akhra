import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { AkhraMark } from "@/components/mark";

const STEPS = [
  {
    who: "Citizen",
    text: "Reports a problem with a photograph and a location.",
  },
  {
    who: "Akhra",
    text: "Sorts it by domain, merges it with everyone else reporting the same thing, and scores how urgent it is.",
  },
  {
    who: "Officer",
    text: "Validates the report and sends it to the institution best placed to work on it.",
  },
  {
    who: "University",
    text: "Forms a student and faculty team and proposes a solution.",
  },
  {
    who: "Industry",
    text: "Backs the proposal with mentoring, funding or prototyping.",
  },
  {
    who: "Citizen",
    text: "Watches the status change until something is actually deployed.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 flex flex-col gap-14">
      <header className="flex flex-col gap-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Government of Jharkhand
        </p>
        <h1 className="flex items-center gap-4 font-display text-5xl font-extrabold sm:text-6xl">
          <span className="text-primary">
            <AkhraMark size={52} />
          </span>
          Akhra
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Every village in Jharkhand already has a place where the community
          brings its problems and decides what to do about them. This is the
          digital one &mdash; and it reaches all the way to a deployed solution.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Create an account
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/home"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open Akhra
            </Link>
          </Show>
        </div>
      </header>

      <section className="flex flex-col gap-1">
        <h2 className="border-b-2 border-foreground pb-2.5 text-2xl font-bold">
          How a problem becomes a solution
        </h2>
        <ol className="flex flex-col">
          {STEPS.map((step, i) => (
            <li
              key={step.who + i}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-4 border-b border-dashed border-border py-3.5 last:border-b-0"
            >
              <span className="font-mono text-xs font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">
                  {step.who}
                </span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
