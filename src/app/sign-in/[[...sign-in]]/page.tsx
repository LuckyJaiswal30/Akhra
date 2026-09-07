"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { safeReturnPath, ssoCallbackFor } from "@/lib/redirects";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const destination = safeReturnPath(useSearchParams().get("redirect_url"));

  const [step, setStep] = useState<"identifier" | "password" | "code">(
    "identifier",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [methods, setMethods] = useState<Set<string>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";
  const globalError = problem ?? errors.global?.[0]?.message ?? null;
  const googleOnly =
    methods.size > 0 && !methods.has("password") && !methods.has("email_code");

  async function finish() {
    const { error } = await signIn.finalize();
    if (error) {
      setProblem(error.message ?? "Something went wrong signing you in.");
      return;
    }
    router.replace(destination);
  }

  function continueWithGoogle() {
    return signIn.sso({
      strategy: "oauth_google",
      redirectUrl: destination,
      redirectCallbackUrl: ssoCallbackFor(destination),
    });
  }

  /**
   * Ask Clerk what this particular account can sign in with before offering a
   * method. An account made with Google has no password at all, and putting a
   * password box in front of it only produces an error nobody can act on.
   */
  async function lookUpAccount(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);

    const identifier = email.trim();
    if (!identifier) {
      setProblem("Type your email address first.");
      return;
    }

    const { error } = await signIn.create({ identifier });
    if (error) return;

    const available = new Set(
      signIn.supportedFirstFactors.map((factor) => factor.strategy),
    );
    setMethods(available);

    if (available.has("password")) {
      setStep("password");
      return;
    }

    if (available.has("email_code")) {
      const sent = await signIn.emailCode.sendCode({ emailAddress: identifier });
      if (sent.error) return;
      setStep("code");
      return;
    }

    setProblem(
      available.has("oauth_google")
        ? "This account was made with Google, so it has no password. Use Continue with Google above."
        : "There is no way to sign in to this account from here. Contact an administrator.",
    );
  }

  async function withPassword(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);
    const { error } = await signIn.password({
      emailAddress: email.trim(),
      password,
    });
    if (error) return;
    if (signIn.status === "complete") await finish();
    else if (signIn.status === "needs_second_factor") {
      setProblem(
        "This account uses two-step verification, which this sign-in screen does not handle yet.",
      );
    }
  }

  async function sendCode() {
    setProblem(null);
    const { error } = await signIn.emailCode.sendCode({
      emailAddress: email.trim(),
    });
    if (!error) setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);
    const { error } = await signIn.emailCode.verifyCode({ code: code.trim() });
    if (error) return;
    if (signIn.status === "complete") await finish();
  }

  function startOver() {
    setStep("identifier");
    setPassword("");
    setCode("");
    setMethods(new Set());
    setProblem(null);
  }

  const SUBTITLE = {
    identifier: "Sign in with the email address you signed up with.",
    password: `Signing in as ${email.trim()}.`,
    code: `We sent a six-digit code to ${email.trim()}.`,
  } as const;

  return (
    <AuthShell
      title="Welcome back"
      subtitle={SUBTITLE[step]}
      footer={
        <>
          First time here?{" "}
          <Link
            href={
              destination === "/home"
                ? "/sign-up"
                : `/sign-up?redirect_url=${encodeURIComponent(destination)}`
            }
            className="font-medium text-foreground underline underline-offset-4"
          >
            Make an account
          </Link>
          . Everyone starts out as a citizen. Officer, university and company
          access is handed out afterwards by an administrator.
        </>
      }
    >
      {step === "identifier" && (
        <div className="flex flex-col gap-5">
          <GoogleButton
            label="Continue with Google"
            action={continueWithGoogle}
          />

          <OrDivider />

          <form onSubmit={lookUpAccount} className="flex flex-col gap-4">
            <Field
              label="Email address"
              error={errors.fields.identifier?.message}
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

            {googleOnly ? (
              <Alert tone="warning" title="This account uses Google">
                It was made with Continue with Google, so there is no password
                to type. Use the Google button above.
              </Alert>
            ) : (
              globalError && <Alert tone="danger">{globalError}</Alert>
            )}

            <div id="clerk-captcha" />

            <Button type="submit" size="lg" loading={busy}>
              Continue
            </Button>
          </form>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={withPassword} className="flex flex-col gap-4">
          <Field
            label="Password"
            error={errors.fields.password?.message}
            required
          >
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>

          {globalError && <Alert tone="danger">{globalError}</Alert>}

          <Button type="submit" size="lg" loading={busy}>
            Sign in
          </Button>

          {methods.has("email_code") && (
            <Button
              type="button"
              variant="ghost"
              onClick={sendCode}
              disabled={busy}
            >
              Email me a code instead
            </Button>
          )}

          <Button type="button" variant="ghost" disabled={busy} onClick={startOver}>
            Use a different email
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
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
            Sign in
          </Button>

          <Button type="button" variant="ghost" disabled={busy} onClick={startOver}>
            Use a different email
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
