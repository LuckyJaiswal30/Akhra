import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENV_KEYS, nearMissWarnings } from '../src/env';

describe('environment near-miss detection', () => {
  it('flags a variable whose name differs from a known one only by letter case', () => {
    const warnings = nearMissWarnings({ Gemini_API_KEY: 'x', Groq_API_Key: 'y' });

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/GEMINI_API_KEY/);
    expect(warnings[1]).toMatch(/GROQ_API_KEY/);
  });

  it('stays quiet about correctly named and unrelated variables', () => {
    expect(
      nearMissWarnings({ GEMINI_API_KEY: 'x', PATH: '/usr/bin', HOME: '/home/akhra' }),
    ).toEqual([]);
  });

  it('never repeats a secret value in its message', () => {
    const [warning] = nearMissWarnings({ gemini_api_key: 'super-secret-value' });

    expect(warning).not.toContain('super-secret-value');
  });
});

/**
 * Read by the test runner and the browser suite rather than by the app, so they are absent from
 * the env schema but still belong in the file a contributor copies.
 */
const TOOLING_KEYS = ['TEST_DATABASE_URL', 'E2E_BASE_URL'];

describe('.env.example', () => {
  it('lists exactly the variables the project reads, so it never drifts from the code', () => {
    const text = readFileSync(
      fileURLToPath(new URL('../../../.env.example', import.meta.url)),
      'utf8',
    );
    const listed = [...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]).sort();

    expect(listed).toEqual(
      [...ENV_KEYS.filter((key) => key !== 'NODE_ENV'), ...TOOLING_KEYS].sort(),
    );
  });
});
