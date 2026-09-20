'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Text cut to a few lines, with a toggle that appears only when something is actually hidden.
 * Whether it overflows depends on the width it renders at, so it is measured rather than guessed
 * from the character count, and measured again when the width changes.
 */
export function ClampedText({
  text,
  moreLabel,
  lessLabel,
  className,
}: {
  text: string;
  moreLabel: string;
  lessLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <>
      <p ref={ref} className={cn(className, !expanded && 'line-clamp-3')}>
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="text-sal mt-1 text-xs underline-offset-4 hover:underline"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </>
  );
}
