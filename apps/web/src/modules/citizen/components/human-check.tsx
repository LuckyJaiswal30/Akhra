'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

interface Turnstile {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function HumanCheck({
  siteKey,
  locale,
  resetSignal,
  error,
}: {
  siteKey: string;
  locale: string;
  resetSignal: unknown;
  error?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.turnstile) setLoaded(true);
  }, []);

  useEffect(() => {
    const turnstile = window.turnstile;
    if (!loaded || !turnstile || !containerRef.current || widgetRef.current) return;
    widgetRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      language: locale === 'hi' ? 'hi' : 'en',
      theme: 'light',
      size: 'flexible',
    });
    return () => {
      if (widgetRef.current) turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [loaded, siteKey, locale]);

  // A token works once, so a refused submission needs a fresh one.
  useEffect(() => {
    if (resetSignal && widgetRef.current) window.turnstile?.reset(widgetRef.current);
  }, [resetSignal]);

  return (
    <div>
      <Script src={SCRIPT} strategy="afterInteractive" onReady={() => setLoaded(true)} />
      <div ref={containerRef} className="min-h-[65px]" />
      {error && (
        <p role="alert" className="text-danger mt-2 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
