import { createHash } from 'node:crypto';
import { normalize } from './text';

export function contentFingerprint(title: string, description: string): string | null {
  const tokens = [...new Set(normalize(`${title} ${description}`))].sort();
  if (tokens.length < 4) return null;
  return createHash('sha256').update(tokens.join(' ')).digest('hex');
}
