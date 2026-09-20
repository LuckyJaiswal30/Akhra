import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/server/env';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(id: string, secret: string): string {
  return createHmac('sha256', serverEnv.INVITE_SIGNING_SECRET)
    .update(`${id}.${secret}`)
    .digest('base64url');
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function issueToken(id: string): { token: string; secretHash: string } {
  const secret = randomBytes(32).toString('base64url');
  return { token: `${id}.${secret}.${sign(id, secret)}`, secretHash: hashSecret(secret) };
}

export function parseToken(token: string): { id: string; secret: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, secret, signature] = parts as [string, string, string];
  if (!UUID.test(id) || !secret || !signature) return null;
  return sameText(signature, sign(id, secret)) ? { id, secret } : null;
}

export function secretMatches(secret: string, storedHash: string): boolean {
  return sameText(hashSecret(secret), storedHash);
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
