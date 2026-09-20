'use client';

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export function OtpInput({
  name,
  label,
  error,
  length = 6,
  autoFocus = false,
}: {
  name: string;
  label: string;
  error?: string;
  length?: number;
  autoFocus?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function fillFrom(index: number, text: string) {
    const incoming = text
      .replace(/\D/g, '')
      .slice(0, length - index)
      .split('');
    if (incoming.length === 0) return;
    setDigits((current) =>
      current.map((digit, i) =>
        i >= index && i < index + incoming.length ? incoming[i - index]! : digit,
      ),
    );
    inputs.current[Math.min(index + incoming.length, length - 1)]?.focus();
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) => current.map((digit, i) => (i === index - 1 ? '' : digit)));
      inputs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) inputs.current[index + 1]?.focus();
  }

  function onPaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData('text'));
  }

  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex justify-center gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            value={digit}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            aria-label={`${label} ${index + 1}/${length}`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, '');
              if (value.length > 1) return fillFrom(index, value);
              setDigits((current) => current.map((d, i) => (i === index ? value : d)));
              if (value && index < length - 1) inputs.current[index + 1]?.focus();
            }}
            onKeyDown={(event) => onKeyDown(index, event)}
            onPaste={(event) => onPaste(index, event)}
            onFocus={(event) => event.target.select()}
            className={cn(
              'border-field bg-surface text-ink h-14 w-0 max-w-14 min-w-0 flex-1 rounded-xl border text-center text-2xl font-semibold tabular-nums transition-colors sm:h-16',
              'focus-visible:border-sal focus-visible:ring-sal/20 aria-invalid:border-danger focus-visible:ring-4 focus-visible:outline-none',
            )}
          />
        ))}
      </div>
      <input type="hidden" name={name} value={digits.join('')} />
      {error && (
        <p role="alert" className="text-danger mt-3 text-center text-sm font-medium">
          {error}
        </p>
      )}
    </fieldset>
  );
}
