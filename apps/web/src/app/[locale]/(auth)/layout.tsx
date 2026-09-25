import type { ReactNode } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { SignInUnavailable } from '@/modules/auth';
import { signInEnabled } from '@/server/sign-in-mode';

export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  if (!signInEnabled) {
    const { locale } = await params;
    return (
      <div className="bg-surface flex flex-1 flex-col">
        <AuthShell locale={locale}>
          <SignInUnavailable />
        </AuthShell>
      </div>
    );
  }
  return <div className="bg-surface flex flex-1 flex-col">{children}</div>;
}
