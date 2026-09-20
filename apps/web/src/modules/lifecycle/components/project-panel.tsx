'use client';

import { STATUS_DEFINITIONS, type ProblemStatus } from '@akhra/shared';

export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line bg-surface shadow-card rounded-2xl border p-5">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="text-subtle mt-1 text-xs">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function statusLabel(status: ProblemStatus, locale: string): string {
  const def = STATUS_DEFINITIONS[status];
  return locale === 'hi' ? def.labelHi : def.labelEn;
}
