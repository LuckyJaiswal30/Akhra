"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import {
  DISTRICTS,
  LANGUAGES,
  REPORTER_KINDS,
  SEVERITY_LABEL,
} from "@/lib/jharkhand";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type Errors = Partial<Record<"title" | "description" | "consent" | "photos", string>>;

export default function ReportPage() {
  const generateUploadUrl = useMutation(api.problems.generateUploadUrl);
  const submit = useMutation(api.problems.submit);
  const router = useRouter();

  const ranchi = DISTRICTS.findIndex((d) => d.name === "Ranchi");
  const [district, setDistrict] = useState(DISTRICTS[ranchi].name);
  const [coords, setCoords] = useState({
    lat: DISTRICTS[ranchi].lat,
    lng: DISTRICTS[ranchi].lng,
  });
  const [precise, setPrecise] = useState(false);
  const [locating, setLocating] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "saving">("idle");

  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => previews.forEach(URL.revokeObjectURL);
  }, [previews]);

  function pickDistrict(name: string) {
    setDistrict(name);
    if (precise) return;
    const match = DISTRICTS.find((d) => d.name === name);
    if (match) setCoords({ lat: match.lat, lng: match.lng });
  }

  function locate() {
    if (!navigator.geolocation) {
      setFailure("This browser cannot share a location. Pick a district instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        });
        setPrecise(true);
        setLocating(false);
        setFailure(null);
      },
      () => {
        setLocating(false);
        setFailure(
          "We could not read your location. The district you picked will be used instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function addPhotos(list: FileList | null) {
    const incoming = Array.from(list ?? []);
    const tooBig = incoming.find((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig) {
      setErrors((e) => ({ ...e, photos: `${tooBig.name} is larger than 8 MB.` }));
      return;
    }
    setErrors((e) => ({ ...e, photos: undefined }));
    setFiles((current) => [...current, ...incoming].slice(0, MAX_PHOTOS));
  }

  async function uploadPhotos(): Promise<Id<"_storage">[]> {
    const ids: Id<"_storage">[] = [];
    for (const file of files) {
      const url = await generateUploadUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`${file.name} failed to upload.`);
      const { storageId } = await response.json();
      ids.push(storageId as Id<"_storage">);
    }
    return ids;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const consent = form.get("consent") === "on";

    const next: Errors = {};
    if (title.length < 6) next.title = "Give it a title of at least six characters.";
    if (description.length < 20)
      next.description = "Please describe it in at least twenty characters.";
    if (!consent) next.consent = "We cannot accept a report without your consent.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFailure(null);
      return;
    }

    setFailure(null);
    try {
      setStage("uploading");
      const photoIds = await uploadPhotos();
      setStage("saving");
      await submit({
        title,
        description,
        language: String(form.get("language") ?? "hi"),
        district,
        block: String(form.get("block") ?? "").trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
        severity: Number(form.get("severity") ?? 3),
        affectedEstimate: Number(form.get("affectedEstimate") ?? 0),
        reporterKind: String(form.get("reporterKind") ?? "citizen") as
          | "citizen"
          | "community_group"
          | "panchayat"
          | "urban_local_body"
          | "department",
        consentGiven: true,
        photoIds,
      });
      router.push("/my-reports");
    } catch (cause) {
      setStage("idle");
      setFailure(
        cause instanceof Error ? cause.message : "Something went wrong. Please try again.",
      );
    }
  }

  const busy = stage !== "idle";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        eyebrow="Citizen"
        title="Report a problem"
        description="Tell us what is wrong where you live. You will be able to follow this all the way to a solution."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Card>
          <CardBody className="flex flex-col gap-5">
            <Step n={1} label="What is wrong" />

            <Field
              label="In one line"
              required
              error={errors.title}
              hint="Something a person can read at a glance."
            >
              {(p) => (
                <Input
                  {...p}
                  name="title"
                  placeholder="Handpump water has turned muddy"
                  autoComplete="off"
                />
              )}
            </Field>

            <Field
              label="Describe it"
              required
              error={errors.description}
              hint="Where exactly, how long it has been happening, and who it affects."
            >
              {(p) => <Textarea {...p} name="description" rows={5} />}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Language you are writing in">
                {(p) => (
                  <Select {...p} name="language" defaultValue="hi">
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Reporting as">
                {(p) => (
                  <Select {...p} name="reporterKind" defaultValue="citizen">
                    {REPORTER_KINDS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-5">
            <Step n={2} label="Where it is" />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="District" required>
                {(p) => (
                  <Select
                    {...p}
                    value={district}
                    onChange={(e) => pickDistrict(e.target.value)}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Block or village" hint="Optional, but it helps.">
                {(p) => <Input {...p} name="block" placeholder="Torpa" />}
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary px-4 py-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={locate}
                loading={locating}
              >
                Use my exact location
              </Button>
              <Badge tone={precise ? "primary" : "neutral"}>
                {precise ? "Exact" : "District centre"}
              </Badge>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-5">
            <Step n={3} label="How bad is it" />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="How serious is it?" required>
                {(p) => (
                  <Select {...p} name="severity" defaultValue="3">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        {SEVERITY_LABEL[level]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="How many people does it affect?"
                hint="A rough guess is fine."
              >
                {(p) => (
                  <Input
                    {...p}
                    name="affectedEstimate"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={200}
                  />
                )}
              </Field>
            </div>

            <Field
              label="Photographs"
              error={errors.photos}
              hint={`Up to ${MAX_PHOTOS}. These are stored privately and shown only to people working on the problem.`}
            >
              {(p) => (
                <Input
                  {...p}
                  type="file"
                  accept="image/*"
                  multiple
                  className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              )}
            </Field>

            {previews.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <li key={src} className="relative">
                    <span className="block size-24 overflow-hidden rounded-lg border border-border">
                      <Image
                        src={src}
                        alt={files[i]?.name ?? ""}
                        width={96}
                        height={96}
                        unoptimized
                        className="size-full object-cover"
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((c) => c.filter((_, index) => index !== i))
                      }
                      className="absolute -right-2 -top-2 size-6 rounded-full border border-border bg-card text-sm leading-none text-muted-foreground shadow-sm hover:text-danger"
                      aria-label={`Remove ${files[i]?.name ?? "photo"}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <Checkbox
              name="consent"
              label={
                <>
                  I agree that this report, my photographs and the district it
                  came from may be shared with government officers, universities
                  and industry partners working on it.{" "}
                  <strong className="font-semibold">
                    My exact location is shown only to the validating officer.
                  </strong>{" "}
                  I can ask for this report to be removed at any time.
                </>
              }
            />
            {errors.consent && (
              <p className="text-xs font-medium text-danger">{errors.consent}</p>
            )}
          </CardBody>
        </Card>

        {failure && <Alert tone="danger">{failure}</Alert>}

        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">
            {stage === "uploading"
              ? "Uploading photographs…"
              : stage === "saving"
                ? "Sending your report…"
                : "Submit report"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-semibold text-accent-foreground">
        {n}
      </span>
      <h2 className="text-base font-semibold">{label}</h2>
    </div>
  );
}
