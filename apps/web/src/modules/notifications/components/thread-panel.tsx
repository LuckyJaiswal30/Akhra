'use client';

import { useActionState } from 'react';
import { ActionFeedback, Button, Select, Textarea, useActionForm } from '@/components/ui';
import { label, type Labels, INDIA_TIME_ZONE } from '@/lib/utils';
import { postMessageAction } from '../actions';
import { INITIAL_THREAD_STATE } from '../state';
import type { ThreadAccess, ThreadMessage } from '../thread';

export function ThreadPanel({
  problemId,
  returnPath,
  messages,
  access,
  locale,
  labels,
}: {
  problemId: string;
  returnPath: string;
  messages: ThreadMessage[];
  access: ThreadAccess;
  locale: string;
  labels: Labels;
}) {
  const [state, action, isPending] = useActionState(postMessageAction, INITIAL_THREAD_STATE);
  const form = useActionForm(action, state);
  const timeFormat = new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: INDIA_TIME_ZONE,
  });

  return (
    <section className="border-line bg-surface shadow-card rounded-2xl border p-5">
      <h2 className="font-medium">{label(labels, 'thread')}</h2>
      <p className="text-subtle mt-1 text-xs">{label(labels, 'threadHint')}</p>

      {messages.length === 0 ? (
        <p className="text-subtle mt-4 text-sm">{label(labels, 'noMessages')}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-md border px-3.5 py-2.5 ${
                message.visibility === 'internal'
                  ? 'border-line bg-well/40 border-dashed'
                  : 'border-line'
              }`}
            >
              <div className="text-subtle flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                <span className="text-ink font-medium">{message.authorName ?? '—'}</span>
                {message.authorOrganization && <span>{message.authorOrganization}</span>}
                {message.authorRole && <span>{label(labels, `role_${message.authorRole}`)}</span>}
                <span>{timeFormat.format(new Date(message.createdAt))}</span>
                {message.visibility === 'internal' && (
                  <span className="border-line rounded-full border px-1.5">
                    {label(labels, 'internal')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm whitespace-pre-line">{message.body}</p>
            </li>
          ))}
        </ol>
      )}

      {access.canPost && (
        <form {...form} className="border-line mt-5 space-y-3 border-t pt-4">
          <input type="hidden" name="problemId" value={problemId} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <ActionFeedback state={state} />

          <Textarea
            name="body"
            rows={3}
            maxLength={4000}
            placeholder={label(labels, 'messagePlaceholder')}
            required
          />
          <div className="flex flex-wrap items-center gap-2">
            {access.canPostInternal && (
              <Select name="visibility" defaultValue="public" className="w-auto">
                <option value="public">{label(labels, 'visibilityPublic')}</option>
                <option value="internal">{label(labels, 'visibilityInternal')}</option>
              </Select>
            )}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? label(labels, 'sending') : label(labels, 'send')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
