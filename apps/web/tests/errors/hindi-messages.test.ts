import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HINDI_MESSAGES, toHindi } from '@/server/hindi';

const root = fileURLToPath(new URL('../../src/', import.meta.url));
const shared = fileURLToPath(new URL('../../../../packages/shared/src/', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'components' ? [] : sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

const SHOWN_TO_PEOPLE =
  /(?:message: |error: |ForbiddenError\(|Errors\.\w+\(|rateLimitedError\([^,]+, |new AppError\(\s*'[A-Z_]+',\s*|\.(?:min|max|length|regex|email|refine)\([^'()]*|z\.email\()'([^']+)'/g;

const FOR_DEVELOPERS_ONLY = new Set([
  'The request body is not valid JSON.',
  'This endpoint is only for the scheduler.',
  'The webhook signature could not be verified.',
]);

describe('server messages in Hindi', () => {
  it('has a Hindi version of every message an action or check can send back', () => {
    const missing = sourceFiles(join(root, 'modules'))
      .concat(
        sourceFiles(join(root, 'server')),
        sourceFiles(join(root, 'app', 'api')),
        sourceFiles(shared),
      )
      .flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(SHOWN_TO_PEOPLE)].map((m) => m[1]!),
      )
      .filter((text) => /\s/.test(text) && !/^[a-z]/.test(text) && !/^[A-Z_]{4,} /.test(text))
      .filter((text) => !FOR_DEVELOPERS_ONLY.has(text))
      .filter((text) => toHindi(text) === text);

    expect([...new Set(missing)]).toEqual([]);
  });

  it('fills in numbers and names in messages that carry them', () => {
    expect(toHindi('Too many attempts on this report. Please wait 40 minutes and try again.')).toBe(
      'इस रिपोर्ट पर बहुत ज़्यादा कोशिशें हुईं। कृपया 40 मिनट रुककर फिर कोशिश करें।',
    );
    expect(toHindi('Files must be under 10 MB.')).toBe('फ़ाइल 10 MB से छोटी होनी चाहिए।');
    expect(toHindi('A report that is "Closed" cannot move directly to "Validated".')).toContain(
      '“बंद”',
    );
  });

  it('leaves a message it does not know in English rather than guessing', () => {
    expect(toHindi('Something nobody has written yet.')).toBe('Something nobody has written yet.');
    expect(Object.keys(HINDI_MESSAGES).length).toBeGreaterThan(150);
  });
});
