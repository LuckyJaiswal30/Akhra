'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const cancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', cancel);
    return () => dialog.removeEventListener('cancel', cancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'bg-surface text-ink shadow-card m-auto w-[calc(100vw-2rem)] max-w-xl rounded-2xl p-0',
        'backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      <div className="border-line flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className="text-ink text-lg font-bold">
            {title}
          </h2>
          {description && <p className="text-subtle mt-0.5 text-sm">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="text-subtle hover:bg-well hover:text-ink -mt-1 -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors"
        >
          <X aria-hidden className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
    </dialog>
  );
}
