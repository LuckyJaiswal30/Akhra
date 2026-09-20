'use client';

import { Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Field, Input } from '@/components/ui';

export interface FilterablePerson {
  id: string;
  /** Everything worth matching on, already rendered: name, email, district, department, post. */
  haystack: string;
  card: ReactNode;
}

/**
 * An alphabetical list of thirty-odd officers is still thirty-odd cards to scan. Typing a few
 * letters of a name, a district or a department narrows it to the one person being looked for.
 * The filter is a plain substring match so it works the same in English and Hindi.
 */
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
        {/* A capsule, like every other action control in Akhra, and wide enough to read a
            department name back. The placeholder says what to type, so no separate hint. */}
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
