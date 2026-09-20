import { AppError } from '@akhra/shared';
import { assertCanAddDocument, recordDocument } from '@/modules/lifecycle';
import { apiRoute, created } from '@/server/api';
import { getFileStorage } from '@/server/file-storage';
import { consumeRateLimit, rateLimitedError } from '@/server/rate-limit';
import { requireActor } from '@/server/session';

export const runtime = 'nodejs';

const ONE_HOUR = 60 * 60 * 1000;
const DOCUMENTS_PER_HOUR = 30;

export const POST = apiRoute<{ id: string }>(async (request, { params }) => {
  const { id: projectId } = await params;
  const actor = await requireActor();
  await assertCanAddDocument(actor, projectId);

  const limit = await consumeRateLimit(`documents:${actor.userId}`, DOCUMENTS_PER_HOUR, ONE_HOUR);
  if (!limit.allowed) throw rateLimitedError(limit.resetAt, 'uploads');

  const formData = await request.formData().catch(() => {
    throw new AppError('VALIDATION_FAILED', 'Send the document as a file upload.');
  });
  const file = formData.get('file');
  const title = String(formData.get('title') ?? '').trim();
  const milestoneId = String(formData.get('milestoneId') ?? '') || undefined;

  if (!(file instanceof File)) {
    throw new AppError('VALIDATION_FAILED', 'Choose a file to upload.', {
      fields: { file: 'Choose a file to upload.' },
    });
  }
  if (title.length < 3 || title.length > 180) {
    throw new AppError('VALIDATION_FAILED', 'Give the document a title of 3 to 180 characters.', {
      fields: { title: 'Give the document a title of 3 to 180 characters.' },
    });
  }

  const stored = await getFileStorage().put(file, `projects/${projectId}`);
  return created(
    await recordDocument(actor, projectId, {
      title,
      storageKey: stored.storageKey,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      milestoneId,
    }),
  );
});
