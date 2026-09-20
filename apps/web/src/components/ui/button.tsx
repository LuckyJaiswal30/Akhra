import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sal',
  {
    variants: {
      variant: {
        primary: 'bg-sal text-on-sal hover:bg-sal-deep',
        secondary: 'border border-line bg-surface text-ink hover:border-field hover:bg-mint',
        ghost: 'text-sal hover:bg-sal-wash hover:text-sal-deep',
        destructive: 'bg-danger text-on-danger hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export function buttonVariants(props?: Parameters<typeof variants>[0]): string {
  return cn(variants(props));
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(variants({ variant, size }), className)} {...props} />;
}
