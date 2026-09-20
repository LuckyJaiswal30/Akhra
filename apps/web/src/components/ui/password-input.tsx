'use client';

import { Check, Circle, Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';
import {
  passwordRules,
  passwordStrength,
  type PasswordPolicy,
  type PasswordRuleId,
} from '@akhra/shared';
import { cn } from '@/lib/utils';
import { controlClasses } from './field';

export function PasswordInput({
  showLabel,
  hideLabel,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { showLabel: string; hideLabel: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <Lock
        aria-hidden
        className="text-subtle pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2"
      />
      <input
        type={visible ? 'text' : 'password'}
        className={cn(controlClasses, 'pr-12 pl-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="text-subtle hover:bg-well hover:text-ink absolute inset-y-0 right-1 my-auto grid h-10 w-10 place-items-center rounded-full transition-colors"
      >
        {visible ? (
          <EyeOff aria-hidden className="h-[18px] w-[18px]" />
        ) : (
          <Eye aria-hidden className="h-[18px] w-[18px]" />
        )}
      </button>
    </span>
  );
}

export type PasswordChecklistLabels = { title: string } & Record<PasswordRuleId, string>;

const withMin = (text: string, policy?: PasswordPolicy) =>
  text.replace(/\{min\}/g, String(policy?.minLength ?? ''));

export function PasswordChecklist({
  password,
  email,
  policy,
  labels,
}: {
  password: string;
  email?: string;
  policy?: PasswordPolicy;
  labels: PasswordChecklistLabels;
}) {
  const rules = passwordRules(password, { policy, email });
  return (
    <div className="bg-mint rounded-xl px-4 py-3">
      <p className="text-ink text-sm font-semibold">{labels.title}</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={cn('flex items-center gap-2', rule.met ? 'text-sal-deep' : 'text-subtle')}
          >
            {rule.met ? (
              <Check aria-hidden className="h-4 w-4 shrink-0" strokeWidth={3} />
            ) : (
              <Circle aria-hidden className="h-4 w-4 shrink-0" />
            )}
            <span>
              {withMin(labels[rule.id], policy)}
              <span className="sr-only">{rule.met ? ' (met)' : ' (not yet)'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SEGMENTS: Record<'weak' | 'medium' | 'strong', number> = { weak: 1, medium: 2, strong: 3 };

export function PasswordStrength({
  password,
  email,
  policy,
  labels,
}: {
  password: string;
  email?: string;
  policy?: PasswordPolicy;
  labels: { label: string; weak: string; medium: string; strong: string };
}) {
  const level = passwordStrength(password, { policy, email });
  const filled = SEGMENTS[level];
  const tone = { weak: 'bg-danger', medium: 'bg-warning', strong: 'bg-sal' }[level];
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div aria-hidden className="grid flex-1 grid-cols-3 gap-1.5">
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={cn('h-1.5 rounded-full', segment <= filled ? tone : 'bg-line')}
          />
        ))}
      </div>
      <span className="text-subtle min-w-16 text-right text-xs font-semibold">
        <span className="sr-only">{labels.label}: </span>
        {labels[level]}
      </span>
    </div>
  );
}
