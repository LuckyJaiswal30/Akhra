'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input, Select } from '@/components/ui';
import { formatDate, label, type Labels } from '@/lib/utils';
import type { Lifecycle } from '../service';
import { Panel } from './project-panel';

export function DocumentsPanel({
  projectId,
  lifecycle,
  locale,
  labels,
}: {
  projectId: string;
  lifecycle: Lifecycle;
  locale: string;
  labels: Labels;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isHindi = locale === 'hi';

  async function upload(form: HTMLFormElement) {
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/documents`, {
      method: 'POST',
      body: new FormData(form),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? label(labels, 'uploadFailed'));
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <Panel title={label(labels, 'documents')} hint={label(labels, 'documentsHint')}>
      {lifecycle.documents.length === 0 ? (
        <p className="text-subtle text-sm">{label(labels, 'noDocuments')}</p>
      ) : (
        <ul className="space-y-2">
          {lifecycle.documents.map((doc) => (
            <li
              key={doc.id}
              className="border-line flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <a
                href={
                  doc.storageKey.startsWith('http')
                    ? doc.storageKey
                    : `/api/files/${doc.storageKey}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
              >
                {doc.title}
              </a>
              <span className="text-subtle text-xs">
                {doc.uploadedBy ?? '—'}, {formatDate(doc.createdAt, isHindi ? 'hi-IN' : 'en-IN')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {lifecycle.canAddDocument && (
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            startTransition(() => void upload(form));
          }}
          className="border-line mt-5 space-y-3 border-t pt-4"
        >
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="title"
              placeholder={label(labels, 'documentTitle')}
              maxLength={180}
              required
            />
            <Select name="milestoneId" defaultValue="">
              <option value="">{label(labels, 'noMilestoneLink')}</option>
              {lifecycle.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </div>
          <input
            name="file"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4"
            className="file:border-line file:bg-surface block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
            {isPending ? label(labels, 'uploading') : label(labels, 'upload')}
          </Button>
        </form>
      )}
    </Panel>
  );
}
