import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENV_KEYS, getServerEnv, nearMissWarnings, resetServerEnvCache } from '../src/env';

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

const EXPECTED_KEYS = [...ENV_KEYS.filter((key) => key !== 'NODE_ENV'), ...TOOLING_KEYS].sort();

const readRepoFile = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), 'utf8');

describe('documented variables', () => {
  it('.env.example lists exactly the variables the project reads', () => {
    const listed = [...readRepoFile('.env.example').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)]
      .map((match) => match[1])
      .sort();

    expect(listed).toEqual(EXPECTED_KEYS);
  });

  it('the README table lists exactly the variables the project reads', () => {
    const listed = [...readRepoFile('README.md').matchAll(/^\| `([A-Z][A-Z0-9_]*)` +\|/gm)]
      .map((match) => match[1])
      .sort();

    expect(listed).toEqual(EXPECTED_KEYS);
  });
});

describe('ALLOW_SEED', () => {
  const base = { DATABASE_URL: 'postgres://x', INVITE_SIGNING_SECRET: 'x'.repeat(32) };

  it.each([
    ['false', false],
    ['true', true],
  ])('reads "%s" as %s', (value, expected) => {
    resetServerEnvCache();
    expect(getServerEnv({ ...base, ALLOW_SEED: value }).ALLOW_SEED).toBe(expected);
    resetServerEnvCache();
  });
});
