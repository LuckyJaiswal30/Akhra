'use client';

import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert, Card, buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { useFinishTo, type Labels } from './auth-parts';

export function SsoCallback({ labels, target }: { labels: Labels; target: string }) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const finish = useFinishTo(target);
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clerk.loaded || ran.current) return;
    ran.current = true;

    void (async () => {
      if (signIn.status === 'complete') {
        await signIn.finalize({ navigate: finish });
        return;
      }
      if (signUp.isTransferable) {
        await signIn.create({ transfer: true });
        if ((signIn.status as string) === 'complete') {
          await signIn.finalize({ navigate: finish });
          return;
        }
        setFailed(true);
        return;
      }
      if (signIn.isTransferable) {
        await signUp.create({ transfer: true });
        if (signUp.status === 'complete') {
          await signUp.finalize({ navigate: finish });
          return;
        }
        setFailed(true);
        return;
      }
      if (signUp.status === 'complete') {
        await signUp.finalize({ navigate: finish });
        return;
      }
      const existing = signIn.existingSession?.sessionId ?? signUp.existingSession?.sessionId;
      if (existing) {
        await clerk.setActive({ session: existing, navigate: finish });
        return;
      }
      setFailed(true);
    })();
  }, [clerk, signIn, signUp, finish]);

  return (
    <Card className="p-8 text-center sm:p-10">
      {failed ? (
        <div className="space-y-6">
          <Alert tone="error">{labels.ssoFailed}</Alert>
          <Link href="/sign-in" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            {labels.signIn}
          </Link>
        </div>
      ) : (
        <p role="status" className="text-subtle flex items-center justify-center gap-3">
          <LoaderCircle
            aria-hidden
            className="text-sal h-5 w-5 animate-spin motion-reduce:animate-none"
          />
          {labels.ssoWorking}
        </p>
      )}
      <div id="clerk-captcha" />
    </Card>
  );
}
