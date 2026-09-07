"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Input,
  Page,
  Textarea,
} from "@/components/ui";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { DISTRICTS } from "@/lib/jharkhand";
import type { DistrictName } from "@convex/lib/districts";
import { referenceFor } from "@/lib/reference";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const STEPS = ["photo", "category", "where", "describe", "scale", "review"] as const;
type Step = (typeof STEPS)[number];

const SEVERITY: { value: number; en: string }[] = [
  { value: 2, en: "It is a nuisance" },
  { value: 3, en: "It affects daily life" },
  { value: 4, en: "Someone could be harmed" },
  { value: 5, en: "It is an emergency" },
];

const WAIVERS: { value: string; en: string }[] = [
  { value: "Nothing to photograph", en: "There is nothing a photo would show" },
  { value: "Not safe to photograph", en: "It was not safe to take one" },
  { value: "No camera", en: "My phone cannot take or send photos" },
];

const SCALE: { value: number; en: string }[] = [
  { value: 60, en: "A few households" },
  { value: 1500, en: "My whole village or ward" },
  { value: 8000, en: "Several villages" },
  { value: 50000, en: "The whole block" },
];

export default function ReportPage() {
  const generateUploadUrl = useMutation(api.problems.generateUploadUrl);
  const submit = useMutation(api.problems.submit);

  const [step, setStep] = useState<Step>("photo");
  const [files, setFiles] = useState<File[]>([]);
  const [waiver, setWaiver] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [district, setDistrict] = useState<DistrictName | "">("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [precise, setPrecise] = useState(false);
  const [locating, setLocating] = useState(false);
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<number | null>(null);
  const [affected, setAffected] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; at: number } | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);

  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );
  useEffect(
    () => () => {
      for (const url of previews) URL.revokeObjectURL(url);
    },
    [previews],
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const index = STEPS.indexOf(step);

  function go(next: number) {
    setError(null);
    setNudge(null);
    setStep(STEPS[Math.min(STEPS.length - 1, Math.max(0, next))]);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const chosen = Array.from(list);
    const incoming = chosen.filter(
      (f) => f.type.startsWith("image/") && f.size <= MAX_PHOTO_BYTES,
    );

    setWaiver(null);
    setFiles((current) => {
      const room = MAX_PHOTOS - current.length;
      const kept = incoming.slice(0, Math.max(0, room));

      if (incoming.length !== chosen.length) {
        setError("Some files were skipped. Photos only, and under 8 MB each.");
      } else if (kept.length !== incoming.length) {
        setError(`You can add up to ${MAX_PHOTOS} photos.`);
      }

      return [...current, ...kept];
    });
  }

  function findMyLocation() {
    if (!navigator.geolocation) {
      setError(
        "This browser cannot share your location. Choose your district below instead.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setPrecise(true);
        let best = DISTRICTS[0];
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const d of DISTRICTS) {
          const distance = (d.lat - latitude) ** 2 + (d.lng - longitude) ** 2;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = d;
          }
        }
        setDistrict(best.name);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(
          "We could not get your location. Choose your district below instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function chooseDistrict(name: DistrictName | "") {
    setDistrict(name);
    if (precise || !name) return;
    const centre = DISTRICTS.find((d) => d.name === name);
    if (centre) setCoords({ lat: centre.lat, lng: centre.lng });
  }

  function blockerFor(at: Step): string | null {
    if (at === "photo" && files.length === 0 && !waiver)
      return "Add a photo, or tell us why you cannot.";
    if (at === "category" && !category) return "Choose one to continue.";
    if (at === "where" && (!district || !coords))
      return "Choose the district this problem is in.";
    if (at === "describe" && description.trim().length < 20)
      return "Please write a little more — at least a full sentence.";
    if (at === "scale" && (severity === null || affected === null))
      return "Answer both questions.";
    return null;
  }

  async function send() {
    // The review step is reachable by pressing Back, so everything is checked
    // once more here rather than trusting the path that got us here.
    for (const earlier of STEPS.slice(0, STEPS.indexOf("review"))) {
      const gap = blockerFor(earlier);
      if (gap) {
        setStep(earlier);
        setNudge(gap);
        return;
      }
    }
    if (!consent) {
      setNudge(
        "Please tick the box so we can share your report with the officer.",
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const photoIds: Id<"_storage">[] = [];
      for (const file of files) {
        const url = await generateUploadUrl({});
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error(
            "One of your photos would not upload. Remove it and try again.",
          );
        }
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        photoIds.push(storageId);
      }

      const topic = categoryLabel(category!);
      const where = landmark.trim() || district;

      const id = await submit({
        title: `${topic} — ${where}`,
        description: description.trim(),
        language: "en",
        district,
        block: landmark.trim() || undefined,
        lat: coords!.lat,
        lng: coords!.lng,
        severity: severity!,
        affectedEstimate: affected!,
        reporterKind: "citizen",
        consentGiven: true,
        photoIds,
        photoWaiver: photoIds.length === 0 ? (waiver ?? undefined) : undefined,
      });

      setDone({ id: String(id), at: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Receipt id={done.id} at={done.at} />;

  // The warning only appears once someone has actually tried to move on, and
  // clears itself the moment the gap it names is filled.
  const gap = blockerFor(step);
  const warning = nudge && gap ? gap : null;

  return (
    <Page width="column" className="gap-6">
      <Progress index={index} total={STEPS.length} />

      <div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none"
        >
          {step === "photo" && "Do you have a photo?"}
          {step === "category" && "What kind of problem is it?"}
          {step === "where" && "Where is it?"}
          {step === "describe" && "What is wrong?"}
          {step === "scale" && "How bad is it?"}
          {step === "review" && "Does this look right?"}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          {step === "photo" &&
            "A photo helps the officer confirm it without coming out first. If you cannot add one, tell us why."}
          {step === "category" &&
            "Pick the closest one. If you get it wrong we will sort it out."}
          {step === "where" &&
            "Your exact location is only ever shown to the officer checking this report."}
          {step === "describe" && "Your own words are fine. No need to be formal."}
          {step === "scale" &&
            "Two quick questions. Your answers help the officer decide what to look at first."}
          {step === "review" && "Check this is right, then send it."}
        </p>
      </div>

      {step === "photo" && (
        <div className="flex flex-col gap-4">
          <label
            className={cn(
              "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2",
              "rounded-sm border-2 border-dashed border-border-strong bg-card px-6 py-8",
              "text-center transition-colors hover:border-primary hover:bg-accent",
            )}
          >
            <svg
              viewBox="0 0 32 32"
              className="size-10 text-primary"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11a2 2 0 0 1 2-2h3l2-3h10l2 3h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11Z" />
              <circle cx="16" cy="17" r="5" />
            </svg>
            <span className="text-base font-medium">Add a photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {warning && <Nudge>{warning}</Nudge>}

          {previews.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {previews.map((src, i) => (
                <li key={src} className="relative">
                  <Image
                    src={src}
                    alt={`Photo ${i + 1} you added`}
                    width={200}
                    height={200}
                    unoptimized
                    className="h-28 w-full rounded-sm border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) => current.filter((_, j) => j !== i))
                    }
                    className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-sm bg-ink/85 text-base text-white"
                  >
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">{`Remove photo ${i + 1}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {files.length === 0 && (warning || waiver) && (
            <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
              <legend className="text-base font-medium">
                No photo? Tell the officer why.
              </legend>
              <p className="text-sm text-muted-foreground">
                Reports without a photo still count. The officer just needs to
                know not to wait for one.
              </p>
              {WAIVERS.map((w) => (
                <ChoiceButton
                  key={w.value}
                  active={waiver === w.value}
                  onClick={() => setWaiver(waiver === w.value ? null : w.value)}
                >
                  {w.en}
                </ChoiceButton>
              ))}
            </fieldset>
          )}
        </div>
      )}

      {step === "category" && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <li key={c.value}>
                <button
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-sm border-2 bg-card p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-accent"
                      : "border-border hover:border-border-strong hover:bg-secondary",
                  )}
                >
                  <span
                    className={active ? "text-primary" : "text-muted-foreground"}
                  >
                    {c.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-medium">{c.en}</span>
                    <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                      {c.hint_en}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {step === "category" && warning && <Nudge>{warning}</Nudge>}

      {step === "where" && (
        <div className="flex flex-col gap-5">
          <Button
            type="button"
            size="lg"
            variant={precise ? "secondary" : "primary"}
            loading={locating}
            onClick={findMyLocation}
            className="self-start"
          >
            {locating
              ? "Finding you…"
              : precise
                ? "Got your location"
                : "Use my current location"}
          </Button>

          <div className="flex flex-col gap-2">
            <label htmlFor="district" className="text-base font-medium">
              District
            </label>
            <select
              id="district"
              value={district}
              onChange={(e) => chooseDistrict(e.target.value as DistrictName | "")}
              className="h-12 w-full rounded-sm border border-input bg-card px-3 text-base"
            >
              <option value="">Choose your district</option>
              {DISTRICTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="landmark" className="text-base font-medium">
              Nearest landmark
            </label>
            <p id="landmark-hint" className="text-sm text-muted-foreground">
              Optional. Something a stranger could find, like a school or a bus
              stop.
            </p>
            <Input
              id="landmark"
              aria-describedby="landmark-hint"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="h-12 text-base"
              placeholder="Near Angara High School"
            />
          </div>

          {warning && <Nudge>{warning}</Nudge>}
        </div>
      )}

      {step === "describe" && (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={7}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-base"
            aria-label="What is wrong?"
            placeholder="The handpump beside the school has been dry since Holi. We now walk to the next hamlet for drinking water."
          />
          {warning && <Nudge>{warning}</Nudge>}
        </div>
      )}

      {step === "scale" && (
        <div className="flex flex-col gap-8">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-base font-medium">How bad is it?</legend>
            {SEVERITY.map((s) => (
              <ChoiceButton
                key={s.value}
                active={severity === s.value}
                onClick={() => setSeverity(s.value)}
              >
                {s.en}
              </ChoiceButton>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-base font-medium">
              Roughly how many people does this affect?
            </legend>
            {SCALE.map((s) => (
              <ChoiceButton
                key={s.value}
                active={affected === s.value}
                onClick={() => setAffected(s.value)}
              >
                {s.en}
              </ChoiceButton>
            ))}
          </fieldset>

          {warning && <Nudge>{warning}</Nudge>}
        </div>
      )}

      {step === "review" && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <Row
              term="What kind of problem is it?"
              value={category ? categoryLabel(category) : "—"}
              onEdit={() => setStep("category")}
              editLabel="Change"
            />
            <Row
              term="Where is it?"
              value={[landmark.trim(), district].filter(Boolean).join(", ")}
              onEdit={() => setStep("where")}
              editLabel="Change"
            />
            <Row
              term="What is wrong?"
              value={description.trim()}
              onEdit={() => setStep("describe")}
              editLabel="Change"
            />
            <Row
              term="Photos"
              value={
                files.length > 0
                  ? `${files.length} attached`
                  : `None — ${waiver ?? "no reason given"}`
              }
              onEdit={() => setStep("photo")}
              editLabel="Change"
            />

            <label className="mt-2 flex items-start gap-3 rounded-sm border border-border bg-secondary p-4">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
              />
              <span className="text-base leading-relaxed">
                I am happy for this to be shown to a district officer, and to
                universities and companies who might help fix it.
              </span>
            </label>

            {warning && <Nudge>{warning}</Nudge>}
          </CardBody>
        </Card>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {index > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => go(index - 1)}
          >
            Back
          </Button>
        )}

        {step === "review" ? (
          <Button type="button" size="lg" loading={busy} onClick={send}>
            Send it in
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={() => {
              if (gap) {
                setNudge(gap);
                return;
              }
              go(index + 1);
            }}
          >
            Next
          </Button>
        )}

      </div>
    </Page>
  );
}

function Nudge({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-danger">
      {children}
    </p>
  );
}

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div>
      <p className="text-base font-medium text-muted-foreground">
        Step {index + 1} of {total}
      </p>
      <ol className="mt-2 flex gap-2" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <li
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= index ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </ol>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-14 w-full items-center rounded-sm border-2 bg-card px-4 text-left text-base transition-colors",
        active
          ? "border-primary bg-accent font-medium"
          : "border-border hover:border-border-strong hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function Row({
  term,
  value,
  onEdit,
  editLabel,
}: {
  term: string;
  value: string;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-muted-foreground">{term}</p>
        <p className="mt-1 leading-relaxed break-words">{value || "—"}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-primary underline underline-offset-2"
      >
        {editLabel}
      </button>
    </div>
  );
}

function Receipt({ id, at }: { id: string; at: number }) {
  const reference = referenceFor(id, at);

  return (
    <Page width="column" className="gap-6">
      <div className="rounded-sm border-l-4 border-success bg-success-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-success">
          That is in.
        </h1>
        <p className="mt-2 text-base leading-relaxed">
          It has gone to the district office. We will let you know each time
          something happens to it.
        </p>
      </div>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-muted-foreground">
            Your reference number
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular">
            {reference}
          </p>
        </CardBody>
      </Card>

      <section>
        <h2 className="text-lg font-semibold">What happens now</h2>
        <ol className="mt-3 flex flex-col border-t border-border">
          {(
            [
              [
                "Today",
                "Your report reaches the district office and is checked against reports already made about the same thing.",
              ],
              [
                "Next",
                "An officer verifies it. If it is real, it is sent to a college or university whose departments work on this kind of problem.",
              ],
              [
                "You will be told",
                "Every time your report moves, you get a message here. You do not need to follow up.",
              ],
            ] as [string, string][]
          ).map(([when, what]) => (
            <li key={when} className="border-b border-border py-4">
              <p className="font-medium">{when}</p>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                {what}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/my-reports"
          className="flex min-h-12 items-center rounded-sm bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Follow this report
        </Link>
        <a
          href="/report"
          className="flex min-h-12 items-center rounded-sm border border-border-strong px-6 text-base font-medium hover:bg-secondary"
        >
          Report something else
        </a>
      </div>
    </Page>
  );
}
