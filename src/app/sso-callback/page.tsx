"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Spinner } from "@/components/ui";
import { safeReturnPath } from "@/lib/redirects";

function Waiting() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-20">
      <Spinner className="size-6 text-primary" />
      <p className="text-base text-muted-foreground" role="status">
        Signing you in&hellip;
      </p>
    </div>
  );
}

function Callback() {
  const params = useSearchParams();
  const destination = safeReturnPath(params.get("redirect_url"));

  return (
    <>
      <Waiting />
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl={destination}
        signUpFallbackRedirectUrl={destination}
        firstFactorUrl="/sign-in"
        secondFactorUrl="/sign-in"
        resetPasswordUrl="/sign-in"
        continueSignUpUrl="/sign-up"
        verifyEmailAddressUrl="/sign-up"
        verifyPhoneNumberUrl="/sign-up"
      />
    </>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={<Waiting />}>
      <Callback />
    </Suspense>
  );
}
