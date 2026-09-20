import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { getDb, problemAttachments, problems, statusEvents, withoutRls } from '@akhra/db';
import { POST as upload } from '@/app/api/uploads/route';
import { submitProblemAction } from '@/modules/citizen';
import { readUploadResponse } from '@/modules/citizen/upload-response';
import { localUploadRoot } from '@/server/file-storage';
import { actAs, callMultipart, formData } from '../helpers';

const uniquePhone = () =>
  `9${Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, '0')}`;

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
]);

const createdProblems: string[] = [];
const storedKeys: string[] = [];

async function uploadFile(file: File) {
  const data = new FormData();
  data.append('file', file);
  const res = await callMultipart(upload, data);
  if (res.status === 201) {
    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ storageKey: problemAttachments.storageKey })
        .from(problemAttachments)
        .where(eq(problemAttachments.id, res.body!.data.id)),
    );
    if (row) storedKeys.push(row.storageKey);
  }
  return res;
}

afterAll(async () => {
  await withoutRls(getDb(), async (tx) => {
    if (createdProblems.length > 0) {
      await tx.delete(statusEvents).where(inArray(statusEvents.problemId, createdProblems));
      await tx
        .delete(problemAttachments)
        .where(inArray(problemAttachments.problemId, createdProblems));
      await tx.delete(problems).where(inArray(problems.id, createdProblems));
    }
    if (storedKeys.length > 0)
      await tx.delete(problemAttachments).where(inArray(problemAttachments.storageKey, storedKeys));
  });
  await Promise.all(storedKeys.map((key) => rm(join(localUploadRoot(), key), { force: true })));
});

describe('photo uploads', () => {
  it('stores a valid image and answers with its attachment id in the standard envelope', async () => {
    actAs(null);
    const res = await uploadFile(new File([PNG], 'handpump.png', { type: 'image/png' }));

    expect(res.status).toBe(201);
    expect(res.body?.data).toMatchObject({ kind: 'photo', originalName: 'handpump.png' });
    expect(typeof res.body?.data.id).toBe('string');
  });

  it('identifies an image the browser sent without a type from its bytes', async () => {
    const res = await uploadFile(new File([PNG], 'from-phone', { type: '' }));

    expect(res.status).toBe(201);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ mimeType: problemAttachments.mimeType })
        .from(problemAttachments)
        .where(eq(problemAttachments.id, res.body!.data.id)),
    );
    expect(row?.mimeType).toBe('image/png');
  });

  it('links the uploaded photo to the report it was attached to', async () => {
    actAs(null);
    const uploaded = await uploadFile(new File([PNG], 'evidence.png', { type: 'image/png' }));
    const attachmentId = uploaded.body!.data.id as string;

    const result = await submitProblemAction(
      null,
      formData({
        title: 'Handpump water has turned yellow in our ward',
        description:
          'The handpump that serves about sixty households now gives yellow water with a strong iron smell.',
        districtCode: 'RAN',
        submitterName: 'Upload Test',
        submitterPhone: uniquePhone(),
        consentToPublish: 'on',
        attachmentIds: [attachmentId],
      }),
    );

    expect(result?.ok).toBe(true);
    const problemId = result?.ok ? result.data!.id : '';
    createdProblems.push(problemId);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ problemId: problemAttachments.problemId })
        .from(problemAttachments)
        .where(eq(problemAttachments.id, attachmentId)),
    );
    expect(row?.problemId).toBe(problemId);
  });

  it('refuses a file over the limit with PAYLOAD_TOO_LARGE and the limit in the message', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(PNG);
    const res = await uploadFile(new File([big], 'huge.png', { type: 'image/png' }));

    expect(res.status).toBe(413);
    expect(res.body?.error).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Files must be under 10 MB.',
    });
  });

  it('refuses a wrong file type with UNSUPPORTED_FILE_TYPE and lists what is accepted', async () => {
    const res = await uploadFile(new File(['name,phone\n'], 'contacts.csv', { type: 'text/csv' }));

    expect(res.status).toBe(415);
    expect(res.body?.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(res.body?.error.message).toBe(
      'Files must be a photo (JPEG, PNG, WebP, HEIC), a video (MP4, MOV) or a PDF.',
    );
  });
});

describe('reading the upload answer in the browser', () => {
  it('takes the attachment from the data envelope', () => {
    expect(
      readUploadResponse(true, { data: { id: 'a1', originalName: 'x.png', kind: 'photo' } }),
    ).toEqual({
      file: { id: 'a1', name: 'x.png', kind: 'photo' },
    });
  });

  it('passes the server’s reason through on a refusal', () => {
    expect(
      readUploadResponse(false, {
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Files must be under 10 MB.' },
      }),
    ).toEqual({
      error: 'Files must be under 10 MB.',
    });
  });

  it('never mistakes an unreadable answer for success', () => {
    expect(readUploadResponse(true, null)).toEqual({ error: null });
    expect(readUploadResponse(false, '<html>')).toEqual({ error: null });
  });
});
