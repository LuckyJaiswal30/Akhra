import {
  Children,
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export const controlClasses =
  'w-full min-h-12 rounded-md border border-field bg-surface px-3.5 py-2.5 text-base text-ink transition-colors placeholder:text-subtle/80 sm:text-[15px] aria-invalid:border-danger focus-visible:border-sal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sal/20 disabled:opacity-55';

export function Field({
  label,
  htmlFor,
  hint,
  hintBelow = false,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  hintBelow?: boolean;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const describedBy = [hint && `${htmlFor}-hint`, error && `${htmlFor}-error`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-ink block text-sm font-medium">
        {label}
        {required && (
          <span className="text-danger ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>
      {hint && !hintBelow && (
        <p id={`${htmlFor}-hint`} className="text-subtle text-sm">
          {hint}
        </p>
      )}
      {describe(children, describedBy, Boolean(error))}
      {hint && hintBelow && (
        <p id={`${htmlFor}-hint`} className="text-subtle text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-danger text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

function describe(children: ReactNode, describedBy: string, invalid: boolean): ReactNode {
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  if (!only || !isValidElement(only)) return children;
  return cloneElement(only as ReactElement<Record<string, unknown>>, {
    'aria-describedby': describedBy || undefined,
    'aria-invalid': invalid || undefined,
  });
}

export function Input({
  className,
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  if (!icon) return <input className={cn(controlClasses, className)} {...props} />;
  return (
    <span className="relative block">
      <span
        aria-hidden
        className="text-subtle pointer-events-none absolute inset-y-0 left-3.5 flex items-center [&>svg]:h-[18px] [&>svg]:w-[18px]"
      >
        {icon}
      </span>
      <input className={cn(controlClasses, 'pl-11', className)} {...props} />
    </span>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, 'min-h-28 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        controlClasses,
        'select-chevron cursor-pointer overflow-hidden pr-10 text-ellipsis whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}
