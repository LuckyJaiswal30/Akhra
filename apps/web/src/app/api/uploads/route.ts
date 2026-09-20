import { AppError } from '@akhra/shared';
import { recordAttachment } from '@/modules/citizen';
import { apiRoute, created } from '@/server/api';
import { serverEnv } from '@/server/env';
import { getFileStorage, uploadTooLarge } from '@/server/file-storage';
import { clientIdentifier, consumeRateLimit, rateLimitedError } from '@/server/rate-limit';
import { getActor } from '@/server/session';

export const runtime = 'nodejs';

const ONE_HOUR = 60 * 60 * 1000;
const UPLOADS_PER_HOUR = 20;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export const POST = apiRoute(async (request) => {
  const actor = await getActor();
  const bucket = actor.userId ?? clientIdentifier(request.headers);

  const limit = await consumeRateLimit(`upload:${bucket}`, UPLOADS_PER_HOUR, ONE_HOUR);
  if (!limit.allowed) throw rateLimitedError(limit.resetAt, 'uploads');

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > serverEnv.MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) throw uploadTooLarge();

  const formData = await request.formData().catch(() => {
    throw new AppError('VALIDATION_FAILED', 'Send the photo or document as a file upload.');
  });
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new AppError('VALIDATION_FAILED', 'Choose a file to upload.', {
      fields: { file: 'Choose a file to upload.' },
    });
  }

  const stored = await getFileStorage().put(file, 'problems');
  const { id } = await recordAttachment(actor, {
    storageKey: stored.storageKey,
    originalName: stored.originalName,
    mimeType: stored.mimeType,
    sizeBytes: stored.sizeBytes,
    kind: stored.kind,
  });

  return created({ id, url: stored.url, kind: stored.kind, originalName: stored.originalName });
});
