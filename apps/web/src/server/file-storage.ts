import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AppError } from '@akhra/shared';
import { serverEnv } from './env';
import { logger } from './logger';

export type AttachmentKind = 'photo' | 'video' | 'document';

const ALLOWED_TYPES: Record<string, { kind: AttachmentKind; ext: string }> = {
  'image/jpeg': { kind: 'photo', ext: 'jpg' },
  'image/png': { kind: 'photo', ext: 'png' },
  'image/webp': { kind: 'photo', ext: 'webp' },
  'image/heic': { kind: 'photo', ext: 'heic' },
  'image/heif': { kind: 'photo', ext: 'heic' },
  'video/mp4': { kind: 'video', ext: 'mp4' },
  'video/quicktime': { kind: 'video', ext: 'mov' },
  'application/pdf': { kind: 'document', ext: 'pdf' },
};

export interface StoredFile {
  storageKey: string;
  url: string;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

export class UploadRejectedError extends AppError {
  constructor(
    code: 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_FILE_TYPE' | 'VALIDATION_FAILED',
    message: string,
  ) {
    super(code, message);
  }
}

interface FileStorage {
  put(file: File, prefix: string): Promise<StoredFile>;
}

export function uploadTooLarge(): UploadRejectedError {
  const limitMb = Math.round(serverEnv.MAX_UPLOAD_BYTES / (1024 * 1024));
  return new UploadRejectedError('PAYLOAD_TOO_LARGE', `Files must be under ${limitMb} MB.`);
}

function validate(file: File, type: string): { kind: AttachmentKind; ext: string } {
  const allowed = ALLOWED_TYPES[type];
  if (!allowed) {
    throw new UploadRejectedError(
      'UNSUPPORTED_FILE_TYPE',
      'Files must be a photo (JPEG, PNG, WebP, HEIC), a video (MP4, MOV) or a PDF.',
    );
  }
  if (file.size === 0) {
    throw new UploadRejectedError('VALIDATION_FAILED', 'That file is empty.');
  }
  if (file.size > serverEnv.MAX_UPLOAD_BYTES) throw uploadTooLarge();
  return allowed;
}

function safeDisplayName(name: string): string {
  return (
    name
      .replace(/[\p{Cc}\p{Cf}/\\<>:"|?*]/gu, '')
      .trim()
      .slice(0, 200) || 'attachment'
  );
}

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end));

const SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && ascii(b, 1, 4) === 'PNG',
  'image/webp': (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  'image/heic': (b) => ascii(b, 4, 8) === 'ftyp',
  'image/heif': (b) => ascii(b, 4, 8) === 'ftyp',
  'video/mp4': (b) => ascii(b, 4, 8) === 'ftyp',
  'video/quicktime': (b) => ['ftyp', 'moov', 'wide', 'mdat'].includes(ascii(b, 4, 8)),
  'application/pdf': (b) => ascii(b, 0, 5) === '%PDF-',
};

const HEIF_BRANDS = ['heic', 'heix', 'heim', 'heis', 'mif1', 'msf1'];

async function resolveType(file: File): Promise<string> {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (SIGNATURES['image/jpeg']!(b)) return 'image/jpeg';
  if (SIGNATURES['image/png']!(b)) return 'image/png';
  if (SIGNATURES['image/webp']!(b)) return 'image/webp';
  if (SIGNATURES['application/pdf']!(b)) return 'application/pdf';
  if (ascii(b, 4, 8) === 'ftyp')
    return HEIF_BRANDS.includes(ascii(b, 8, 12)) ? 'image/heic' : 'video/mp4';
  return file.type;
}

async function assertSignature(file: File, type: string): Promise<void> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches = SIGNATURES[type];
  if (!matches || !matches(head)) {
    throw new UploadRejectedError(
      'UNSUPPORTED_FILE_TYPE',
      'This file’s contents do not match its type. Upload the original photo, video or PDF.',
    );
  }
}

class LocalDiskStorage implements FileStorage {
  private readonly root = localUploadRoot();

  async put(file: File, prefix: string): Promise<StoredFile> {
    const type = await resolveType(file);
    const { kind, ext } = validate(file, type);
    await assertSignature(file, type);
    const storageKey = `${prefix}/${randomUUID()}.${ext}`;
    const target = join(this.root, storageKey);

    await mkdir(join(this.root, prefix), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));

    return {
      storageKey,
      url: `/api/files/${storageKey}`,
      kind,
      mimeType: type,
      sizeBytes: file.size,
      originalName: safeDisplayName(file.name),
    };
  }
}

class VercelBlobStorage implements FileStorage {
  async put(file: File, prefix: string): Promise<StoredFile> {
    const type = await resolveType(file);
    const { kind, ext } = validate(file, type);
    await assertSignature(file, type);
    const storageKey = `${prefix}/${randomUUID()}.${ext}`;

    const { put } = await import('@vercel/blob');
    const blob = await put(storageKey, file, {
      access: 'public',
      contentType: type,
      token: serverEnv.BLOB_READ_WRITE_TOKEN,
    });

    return {
      storageKey: blob.pathname,
      url: `/api/files/${blob.pathname}`,
      kind,
      mimeType: type,
      sizeBytes: file.size,
      originalName: safeDisplayName(file.name),
    };
  }
}

let cached: FileStorage | undefined;

export function getFileStorage(): FileStorage {
  if (!cached) {
    cached =
      serverEnv.FILE_STORAGE_DRIVER === 'blob' ? new VercelBlobStorage() : new LocalDiskStorage();
    logger.debug({ driver: serverEnv.FILE_STORAGE_DRIVER }, 'file storage driver selected');
  }
  return cached;
}

/**
 * Uploads live outside the source tree and are read at runtime, never bundled. Without the ignore
 * comment the build cannot tell, and traces the entire repository into the server output.
 */
export function localUploadRoot(): string {
  return resolve(/* turbopackIgnore: true */ process.cwd(), '../..', serverEnv.LOCAL_UPLOAD_DIR);
}
