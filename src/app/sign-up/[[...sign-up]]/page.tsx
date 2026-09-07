"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { AuthShell } from "@/components/auth-shell";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { Alert, Button, Field, Input, Select, Spinner } from "@/components/ui";
import { DISTRICTS } from "@/lib/jharkhand";
import { safeReturnPath, ssoCallbackFor } from "@/lib/redirects";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const router = useRouter();
  const destination = safeReturnPath(useSearchParams().get("redirect_url"));

  const [step, setStep] = useState<"details" | "code" | "profile">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [district, setDistrict] = useState("");
  const [designation, setDesignation] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";
  const globalError = problem ?? errors.global?.[0]?.message ?? null;

  async function finish() {
    const { error } = await signUp.finalize();
    if (error) {
      setProblem(error.message ?? "Something went wrong making your account.");
      return;
    }
    // The session is live from here, which is the first moment the profile
    // can be written against a real account.
    setProblem(null);
    setStep("profile");
  }

  async function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);

    const { error } = await signUp.password({
      emailAddress: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    if (error) return;

    if (signUp.status === "complete") {
      await finish();
      return;
    }

    if (signUp.unverifiedFields.includes("email_address")) {
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) return;
      setStep("code");
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);
    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (error) return;
    if (signUp.status === "complete") await finish();
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setProblem(null);
    if (!district || designation.trim().length < 2) return;

    setSaving(true);
    try {
      await ensureUser({
        name: `${firstName} ${lastName}`.trim(),
        district,
        designation: designation.trim(),
      });
      router.replace(destination);
    } catch (cause) {
      setProblem(
        cause instanceof Error
          ? cause.message
          : "We could not save that. You can finish it once you are inside.",
      );
      setSaving(false);
    }
  }

  const TITLE = {
    details: "Make an account",
    code: "Check your email",
    profile: "Two last things",
  } as const;

  const SUBTITLE = {
    details:
      "Takes a minute. You will be able to report problems and follow what happens to them.",
    code: `We sent a six-digit code to ${email}.`,
    profile:
      "Your district decides which officer sees what you report. We do not guess it.",
  } as const;

  return (
    <AuthShell
      title={TITLE[step]}
      subtitle={SUBTITLE[step]}
      footer={
        step === "profile" ? (
          <>Your account is made. These two finish setting it up.</>
        ) : (
          <>
            Already have one?{" "}
            <Link
              href={
                destination === "/home"
                  ? "/sign-in"
                  : `/sign-in?redirect_url=${encodeURIComponent(destination)}`
              }
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign in instead
            </Link>
            . If you are an officer, a faculty member, a student or from a
            company, an administrator will give you that access once you are in.
          </>
        )
      }
    >
      {step === "details" && (
        <div className="flex flex-col gap-5">
          <GoogleButton
            label="Continue with Google"
            action={() =>
              signUp.sso({
                strategy: "oauth_google",
                redirectUrl: destination,
                redirectCallbackUrl: ssoCallbackFor(destination),
              })
            }
          />

          <OrDivider />

          <form onSubmit={submitDetails} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First name"
                error={errors.fields.firstName?.message}
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Last name" error={errors.fields.lastName?.message}>
                {(props) => (
                  <Input
                    {...props}
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                )}
              </Field>
            </div>

            <Field
              label="Email address"
              error={errors.fields.emailAddress?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              )}
            </Field>

            <Field
              label="Password"
              error={errors.fields.password?.message}
              hint="At least eight characters."
              required
            >
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>

            {globalError && <Alert tone="danger">{globalError}</Alert>}

            <div id="clerk-captcha" />

            <Button type="submit" size="lg" loading={busy}>
              Continue
            </Button>
          </form>
        </div>
      )}

      {step === "code" && (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <Field label="Six-digit code" error={errors.fields.code?.message} required>
            {(props) => (
              <Input
                {...props}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-lg"
              />
            )}
          </Field>

          {globalError && <Alert tone="danger">{globalError}</Alert>}

          <Button type="submit" size="lg" loading={busy}>
            Confirm my email
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => signUp.verifications.sendEmailCode()}
          >
            Send it again
          </Button>
        </form>
      )}

      {step === "profile" && (
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <Field
            label="District"
            required
            hint="The Jharkhand district this account belongs to."
            error={touched && !district ? "Choose a district." : undefined}
          >
            {(props) => (
              <Select
                {...props}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                <option value="">Choose a district</option>
                {DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Designation"
            required
            hint="How you would introduce yourself here."
            error={
              touched && designation.trim().length < 2
                ? "Add a couple of words at least."
                : undefined
            }
          >
            {(props) => (
              <Input
                {...props}
                value={designation}
                maxLength={80}
                placeholder="Resident"
                onChange={(e) => setDesignation(e.target.value)}
              />
            )}
          </Field>

          {globalError && <Alert tone="danger">{globalError}</Alert>}

          <Button
            type="submit"
            size="lg"
            loading={saving || !isAuthenticated}
          >
            {isAuthenticated ? "Finish" : "Finishing sign-up…"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
