import { Check, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The body of a text page: sections one under another, divided by a rule, at a readable width. */
export function DocumentBody({ children }: { children: ReactNode }) {
  return (
    <article className="[&>*+*]:border-line mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 [&>*+*]:mt-12 [&>*+*]:border-t [&>*+*]:pt-10">
      {children}
    </article>
  );
}

export function DocSection({
  title,
  lead,
  children,
  size = 'lg',
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
  size?: 'lg' | 'md';
}) {
  return (
    <section>
      <h2 className={cn('text-ink font-bold', size === 'lg' ? 'text-2xl' : 'text-xl')}>{title}</h2>
      {lead && (
        <p className={cn('text-subtle leading-relaxed', size === 'lg' ? 'mt-3 text-lg' : 'mt-2')}>
          {lead}
        </p>
      )}
      {children}
    </section>
  );
}

/** Two sections side by side from tablet width, stacked on a phone. */
export function DocColumns({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">{children}</div>;
}

export function MarkList({ items, mark }: { items: ReactNode[]; mark: 'yes' | 'no' }) {
  const Icon = mark === 'yes' ? Check : Minus;
  return (
    <ul className="divide-line mt-5 divide-y">
      {items.map((item, index) => (
        <li key={index} className="text-subtle flex gap-3 py-3">
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full',
              mark === 'yes' ? 'bg-sal-wash text-sal' : 'bg-well text-subtle',
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function NumberedList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="divide-line mt-5 divide-y">
      {items.map((item, index) => (
        <li key={item.title} className="flex gap-4 py-4">
          <span
            aria-hidden
            className="bg-sal text-on-sal grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold"
          >
            {index + 1}
          </span>
          <div>
            <p className="text-ink font-semibold">{item.title}</p>
            <p className="text-subtle mt-1">{item.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
