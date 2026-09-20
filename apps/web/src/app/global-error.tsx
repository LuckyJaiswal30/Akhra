'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '4rem 1.5rem',
          maxWidth: '36rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem' }}>Akhra is having trouble right now</h1>
        <p lang="hi">अखरा में अभी कुछ समस्या है।</p>
        <p>
          Please try again in a moment. If it keeps happening, quote this reference:{' '}
          {error.digest ?? 'unknown'}.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: '1.5rem', padding: '0.6rem 1.2rem' }}
        >
          Try again / पुनः प्रयास करें
        </button>
      </body>
    </html>
  );
}
