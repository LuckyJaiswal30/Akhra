"use client";

export function Wordmark({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="font-wordmark text-2xl leading-tight font-normal">
        Akhra
      </span>
      {tagline && (
        <span className="text-sm text-muted-foreground">
          Report a problem. Follow what happens to it.
        </span>
      )}
    </span>
  );
}

export function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      Skip to the main content
    </a>
  );
}
