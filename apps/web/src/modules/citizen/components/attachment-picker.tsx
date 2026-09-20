'use client';

import { FileText, Image as ImageIcon, LoaderCircle, Paperclip, Video, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_ATTACHMENTS,
  readUploadResponse,
  type UploadedAttachment,
} from '../upload-response';

export interface AttachmentPickerLabels {
  choose: string;
  uploading: string;
  remove: string;
  failed: string;
  tooLarge: string;
  wrongType: string;
  limitReached: string;
}

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

const KIND_ICON = { photo: ImageIcon, video: Video, document: FileText } as const;

export function AttachmentPicker({
  label,
  hint,
  labels,
  maxBytes,
  onChange,
}: {
  label: string;
  hint: string;
  labels: AttachmentPickerLabels;
  maxBytes: number;
  onChange: (ids: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const limitMb = String(Math.round(maxBytes / (1024 * 1024)));

  async function uploadOne(file: File): Promise<UploadedAttachment | string> {
    if (file.type && !ACCEPTED_UPLOAD_TYPES.includes(file.type))
      return fill(labels.wrongType, { name: file.name });
    if (file.size > maxBytes) return fill(labels.tooLarge, { name: file.name, mb: limitMb });

    const body = new FormData();
    body.append('file', file);
    try {
      const response = await fetch('/api/uploads', { method: 'POST', body });
      const payload: unknown = await response.json().catch(() => null);
      const result = readUploadResponse(response.ok, payload);
      return 'error' in result ? `${file.name}: ${result.error ?? labels.failed}` : result.file;
    } catch {
      return `${file.name}: ${labels.failed}`;
    }
  }

  async function handle(list: FileList) {
    const room = MAX_ATTACHMENTS - files.length;
    const chosen = Array.from(list).slice(0, room);
    const problems = list.length > room ? [labels.limitReached] : [];
    setErrors([]);
    setUploading(chosen.map((f) => f.name));

    const added: UploadedAttachment[] = [];
    for (const file of chosen) {
      const result = await uploadOne(file);
      if (typeof result === 'string') problems.push(result);
      else added.push(result);
    }

    setUploading([]);
    setErrors(problems);
    if (added.length > 0) {
      const merged = [...files, ...added];
      setFiles(merged);
      onChange(merged.map((f) => f.id));
    }
  }

  function remove(id: string) {
    const merged = files.filter((f) => f.id !== id);
    setFiles(merged);
    onChange(merged.map((f) => f.id));
  }

  const busy = uploading.length > 0;
  const full = files.length >= MAX_ATTACHMENTS;

  return (
    <div className="space-y-2">
      <p className="text-ink text-sm font-medium">{label}</p>
      <p className="text-subtle text-xs">{hint}</p>

      <input
        ref={inputRef}
        id="attachment-input"
        type="file"
        multiple
        accept={[...ACCEPTED_UPLOAD_TYPES, '.heic', '.heif'].join(',')}
        className="sr-only"
        disabled={busy || full}
        onChange={(event) => {
          const selected = event.target.files;
          if (selected?.length) void handle(selected);
          event.target.value = '';
        }}
      />
      <label
        htmlFor="attachment-input"
        aria-disabled={busy || full}
        className="border-field bg-surface text-sal hover:bg-sal-wash flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm font-medium transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
      >
        <Paperclip aria-hidden className="h-4 w-4" />
        {labels.choose}
      </label>

      <div aria-live="polite">
        {busy && (
          <p className="text-subtle flex items-center gap-2 text-sm">
            <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            {fill(labels.uploading, { count: String(uploading.length) })}
          </p>
        )}
        {errors.map((message) => (
          <p key={message} role="alert" className="text-danger text-sm font-medium">
            {message}
          </p>
        ))}
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file) => {
            const Icon = KIND_ICON[file.kind as keyof typeof KIND_ICON] ?? FileText;
            return (
              <li
                key={file.id}
                className="border-line bg-surface flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <Icon aria-hidden className="text-sal h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => remove(file.id)}
                  aria-label={fill(labels.remove, { name: file.name })}
                  className="text-subtle hover:bg-well hover:text-danger grid h-9 w-9 shrink-0 place-items-center rounded-full"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
