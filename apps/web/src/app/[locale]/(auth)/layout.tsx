import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-surface flex flex-1 flex-col">{children}</div>;
}
