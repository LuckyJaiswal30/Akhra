import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 border-b-2 border-foreground pb-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-bold">{title}</h1>
      {children && (
        <div className="max-w-[65ch] text-muted-foreground">{children}</div>
      )}
    </header>
  );
}

export function Placeholder({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-6">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
        Coming in this build
      </p>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
