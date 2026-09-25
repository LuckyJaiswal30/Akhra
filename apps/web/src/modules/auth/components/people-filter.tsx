'use client';

import { Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Field, Input } from '@/components/ui';

export interface FilterablePerson {
  id: string;
  haystack: string;
  card: ReactNode;
}

export function PeopleFilter({
  people,
  labels,
}: {
  people: FilterablePerson[];
  labels: Record<string, string>;
}) {
  const [term, setTerm] = useState('');
  const needle = term.trim().toLowerCase();
  const shown = useMemo(
    () => (needle ? people.filter((person) => person.haystack.includes(needle)) : people),
    [needle, people],
  );

  return (
    <div className="space-y-4">
      <div className="max-w-xl">
        <Field label={labels.searchLabel!} htmlFor="people-search">
          <Input
            id="people-search"
            type="search"
            autoComplete="off"
            placeholder={labels.searchPlaceholder}
            icon={<Search />}
            className="rounded-full pr-5 pl-12"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </Field>
      </div>
      <p className="text-subtle text-sm" aria-live="polite">
        {(needle ? labels.searchCount : labels.searchAll)
          ?.replace('{count}', String(shown.length))
          .replace('{total}', String(people.length))}
      </p>
      {shown.length === 0 ? (
        <p className="text-subtle border-line rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          {labels.searchNone}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((person) => (
            <li key={person.id} className="border-line flex flex-col gap-3 rounded-lg border p-3">
              {person.card}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
