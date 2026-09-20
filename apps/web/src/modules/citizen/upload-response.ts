export const ACCEPTED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
];

export const MAX_ATTACHMENTS = 5;

export interface UploadedAttachment {
  id: string;
  name: string;
  kind: string;
}

export function readUploadResponse(
  ok: boolean,
  payload: unknown,
): { file: UploadedAttachment } | { error: string | null } {
  const body = (payload ?? {}) as {
    data?: { id?: unknown; originalName?: unknown; kind?: unknown };
    error?: { message?: unknown };
  };
  if (ok && body.data && typeof body.data.id === 'string') {
    return {
      file: {
        id: body.data.id,
        name: typeof body.data.originalName === 'string' ? body.data.originalName : 'attachment',
        kind: typeof body.data.kind === 'string' ? body.data.kind : 'document',
      },
    };
  }
  return { error: typeof body.error?.message === 'string' ? body.error.message : null };
}
