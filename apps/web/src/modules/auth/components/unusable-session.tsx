'use client';

import { useClerk } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Alert, Button, Card } from '@/components/ui';
import type { Labels } from './auth-parts';

export function UnusableSession({ labels, signInPath }: { labels: Labels; signInPath: string }) {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);

  return (
    <Card className="space-y-6 p-6 sm:p-10">
      <Alert tone="error" title={labels.stuckTitle}>
        {labels.stuckBody}
      </Alert>
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOut({ redirectUrl: signInPath });
        }}
      >
        <LogOut aria-hidden className="h-4 w-4" />
        {labels.signOut}
      </Button>
    </Card>
  );
}
