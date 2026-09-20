import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-line bg-surface shadow-card rounded-2xl border', className)}
      {...props}
    />
  );
}
