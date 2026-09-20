'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { JHARKHAND_DISTRICTS, type ApiError } from '@akhra/shared';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { requestJson } from '@/lib/api-client';

export type Labels = Record<string, string>;

/** Districts read in the order the reader expects, which differs between English and Hindi. */
export function districtsByName(locale = 'en') {
  return [...JHARKHAND_DISTRICTS].sort((a, b) =>
    locale === 'hi' ? a.nameHi.localeCompare(b.nameHi, 'hi') : a.nameEn.localeCompare(b.nameEn),
  );
}

/**
 * Actions inside an officer card sit flush with the card's text. A pill's side padding would
 * indent them past the name above, which reads as a misalignment rather than a button.
 */
export const CARD_ACTION =
  'h-auto px-0 py-1 underline-offset-4 hover:bg-transparent hover:underline';

export function fill(template: string | undefined, values: Record<string, string>): string {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

export function useApiSubmit() {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit<T>(url: string, body: Record<string, unknown>, onSuccess: (data: T) => void) {
    setError(null);
    startTransition(async () => {
      const result = await requestJson<T>(url, { body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.data);
      router.refresh();
    });
  }

  return {
    error,
    isPending,
    submit,
    fieldError: (field: string) => error?.details?.fields?.[field],
  };
}

export function InviteLinkNotice({ link, labels }: { link: string; labels: Labels }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border-warning bg-warning-wash text-ink space-y-2 rounded-r-md border-l-4 p-3 text-sm">
      <p>{labels.devLinkNotice}</p>
      <code className="bg-surface block rounded px-2 py-1.5 text-xs break-all">{link}</code>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(link).then(() => setCopied(true));
        }}
      >
        {copied ? labels.copied : labels.copy}
      </Button>
    </div>
  );
}

export interface IssuedInvite {
  delivery: 'clerk' | 'email';
  inviteLink?: string;
}

/** The person an access dialog is about, so an administrator never acts on the wrong one. */
export interface PersonDetails {
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
}

export function PersonSummary({ person, labels }: { person: PersonDetails; labels: Labels }) {
  return (
    <div className="border-line bg-well flex items-center gap-4 rounded-xl border p-4">
      {person.image ? (
        <Image
          src={person.image}
          alt=""
          width={56}
          height={56}
          className="bg-sal-wash h-14 w-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="bg-sal-wash text-sal grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl font-semibold"
        >
          {person.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 text-sm">
        <p className="text-ink font-semibold">{person.name}</p>
        <p className="text-subtle break-all">{person.email}</p>
        <p className="text-subtle tabular-nums">
          {person.phone ? `+91 ${person.phone}` : labels.noPhone}
        </p>
      </div>
    </div>
  );
}
