export function AkhraMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="3.5" r="2.6" fill="currentColor" />
      <circle cx="4.64" cy="16.25" r="2.6" fill="currentColor" />
      <circle cx="19.36" cy="16.25" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 text-primary">
      <AkhraMark size={size} />
      <span className="font-display text-xl font-extrabold text-foreground">
        Akhra
      </span>
    </span>
  );
}
