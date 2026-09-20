import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { canReadAttachment } from '@/modules/citizen';
import { canAccessDocument } from '@/modules/lifecycle';
import { serverEnv } from '@/server/env';
import { localUploadRoot } from '@/server/file-storage';
import { getActor } from '@/server/session';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
};

const notFound = () =>
  NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });

const headersFor = (extension: string, size?: number) => ({
  'content-type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
  ...(size === undefined ? {} : { 'content-length': String(size) }),
  'cache-control': 'private, no-store',
  'content-security-policy': "default-src 'none'; sandbox",
  'x-content-type-options': 'nosniff',
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<NextResponse> {
  const { key } = await params;
  const storageKey = key.join('/');
  const extension = storageKey.split('.').pop()?.toLowerCase() ?? '';

  const actor = await getActor();
  const allowed = storageKey.startsWith('projects/')
    ? await canAccessDocument(actor, storageKey).catch(() => false)
    : storageKey.startsWith('problems/')
      ? await canReadAttachment(actor, storageKey).catch(() => false)
      : false;
  if (!allowed) return notFound();

  if (serverEnv.FILE_STORAGE_DRIVER === 'blob') {
    try {
      const { head } = await import('@vercel/blob');
      const blob = await head(storageKey, { token: serverEnv.BLOB_READ_WRITE_TOKEN });
      const upstream = await fetch(blob.url);
      if (!upstream.ok || !upstream.body) return notFound();
      return new NextResponse(upstream.body, { headers: headersFor(extension, blob.size) });
    } catch {
      return notFound();
    }
  }

  const root = localUploadRoot();
  const target = normalize(join(root, ...key));
  if (!target.startsWith(root + sep)) return notFound();

  try {
    const info = await stat(target);
    if (!info.isFile()) return notFound();
    const stream = Readable.toWeb(createReadStream(target)) as ReadableStream;
    return new NextResponse(stream, { headers: headersFor(extension, info.size) });
  } catch {
    return notFound();
  }
}
