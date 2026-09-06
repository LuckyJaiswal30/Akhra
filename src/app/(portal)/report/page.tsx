"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/kit";
import {
  DISTRICTS,
  LANGUAGES,
  REPORTER_KINDS,
  SEVERITY_LABEL,
} from "@/lib/jharkhand";

export default function ReportPage() {
  const generateUploadUrl = useMutation(api.problems.generateUploadUrl);
  const submit = useMutation(api.problems.submit);
  const router = useRouter();

  const [district, setDistrict] = useState(DISTRICTS[19].name);
  const [coords, setCoords] = useState({
    lat: DISTRICTS[19].lat,
    lng: DISTRICTS[19].lng,
  });
  const [locationSource, setLocationSource] = useState<"district" | "device">(
    "district",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDistrictChange(name: string) {
    setDistrict(name);
    const match = DISTRICTS.find((d) => d.name === name);
    if (match && locationSource === "district") {
      setCoords({ lat: match.lat, lng: match.lng });
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This browser cannot share a location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        });
        setLocationSource("device");
        setError(null);
      },
      () => setError("We could not read your location. Pick a district instead."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
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
      if (!response.ok) throw new Error("A photo failed to upload.");
      const { storageId } = await response.json();
      ids.push(storageId as Id<"_storage">);
    }
    return ids;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(event.currentTarget);

    try {
      const photoIds = await uploadPhotos();
      await submit({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        language: String(form.get("language") ?? "hi"),
        district,
        block: String(form.get("block") ?? "") || undefined,
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
        consentGiven: form.get("consent") === "on",
        photoIds,
      });
      router.push("/my-reports");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Citizen" title="Report a problem">
        <p>
          Tell us what is wrong in your area. Add a photograph if you can. You
          will be able to follow this report all the way to a solution.
        </p>
      </PageHeader>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5">
          <Field label="What is the problem?" hint="A short line someone can scan.">
            <Input
              name="title"
              required
              minLength={6}
              placeholder="Handpump water has turned muddy"
            />
          </Field>

          <Field
            label="Describe it"
            hint="Where exactly, how long it has been going on, and who it affects."
          >
            <Textarea name="description" required minLength={20} rows={5} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Language you are writing in">
              <Select name="language" defaultValue="hi">
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Reporting as">
              <Select name="reporterKind" defaultValue="citizen">
                {REPORTER_KINDS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="District">
              <Select
                value={district}
                onChange={(e) => onDistrictChange(e.target.value)}
              >
                {DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Block or village" hint="Optional, but it helps.">
              <Input name="block" placeholder="Torpa" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" onClick={useMyLocation}>
              Use my exact location
            </Button>
            <Badge tone={locationSource === "device" ? "go" : "neutral"}>
              {locationSource === "device" ? "Exact location" : "District centre"}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="How serious is it?">
              <Select name="severity" defaultValue="3">
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level} — {SEVERITY_LABEL[level]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Roughly how many people does it affect?"
              hint="A guess is fine."
            >
              <Input
                name="affectedEstimate"
                type="number"
                min={0}
                defaultValue={200}
              />
            </Field>
          </div>

          <Field label="Photographs" hint="Up to four. These are stored privately.">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) =>
                setFiles(Array.from(e.target.files ?? []).slice(0, 4))
              }
            />
          </Field>
          {files.length > 0 && (
            <p className="font-mono text-xs text-muted-foreground">
              {files.length} photo{files.length > 1 ? "s" : ""} ready to upload
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-1 size-4 accent-[var(--primary)]"
            />
            <span>
              I agree that this report, my photographs and the district it came
              from may be shared with government officers, universities and
              industry partners working on it. My exact location is shown only to
              the validating officer. I can ask for this report to be removed at
              any time.
            </span>
          </label>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Submit report"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
