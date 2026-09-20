import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { contentFingerprint } from '@akhra/classifier';
import { getDb, problems, withoutRls } from '@akhra/db';
import { findDuplicates } from '@/modules/classification';
import { actAs, cleanupTestData, resetClerkFake } from '../helpers';

const TITLE = 'Handpump beside the market has been dry since the monsoon ended';
const BODY =
  'The handpump that serves the weekly market and about eighty households has been dry since the monsoon ended. People now walk to the next ward for drinking water.';

const created: string[] = [];

async function existing(
  title: string,
  body: string,
  options: { districtCode?: string; fingerprint?: boolean } = {},
) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(problems)
      .values({
        refCode: `AKH-9996-${String(created.length + 1).padStart(6, '0')}`,
        title,
        description: body,
        districtCode: options.districtCode ?? 'RAN',
        submitterType: 'individual',
        submitterName: 'Duplicate Fixture',
        submitterPhone: '9835066666',
        contentFingerprint: options.fingerprint === false ? null : contentFingerprint(title, body),
      })
      .returning({ id: problems.id, refCode: problems.refCode }),
  );
  created.push(row!.id);
  return row!;
}

beforeEach(() => {
  resetClerkFake();
  actAs(null);
});

afterAll(async () => {
  await withoutRls(getDb(), async (tx) => {
    for (const id of created) await tx.delete(problems).where(eq(problems.id, id));
  });
  await cleanupTestData();
});

describe('the same report filed twice is always caught', () => {
  it('matches a word-for-word resubmission with full confidence', async () => {
    const original = await existing(TITLE, BODY);

    const report = await findDuplicates({
      title: TITLE,
      description: BODY,
      districtCode: 'RAN',
      domain: null,
    });

    expect(report.matches.map((match) => match.refCode)).toContain(original.refCode);
    expect(report.checkedBy).toBe('fingerprint');
    expect(report.matches[0]?.similarity).toBe(1);
    expect(report.degraded).toBe(false);
  });

  it('still matches when the words are reordered and the casing differs', async () => {
    const original = await existing(TITLE, BODY);

    const report = await findDuplicates({
      title: TITLE.toUpperCase(),
      description: `${BODY.split('. ').reverse().join('. ')}`,
      districtCode: 'RAN',
      domain: null,
    });

    expect(report.matches.map((match) => match.refCode)).toContain(original.refCode);
  });

  it('catches it even when the second report names a different district', async () => {
    const original = await existing(TITLE, BODY, { districtCode: 'RAN' });

    const report = await findDuplicates({
      title: TITLE,
      description: BODY,
      districtCode: 'DHA',
      domain: null,
    });

    expect(report.matches.map((match) => match.refCode)).toContain(original.refCode);
  });

  it('does not match a genuinely different report in the same district', async () => {
    await existing(TITLE, BODY);

    const report = await findDuplicates({
      title: 'Upper primary school has had no science teacher since June',
      description:
        'The upper primary school lost its only science teacher in June and no replacement has been posted. Ninety children in classes six to eight have had no science lessons since.',
      districtCode: 'RAN',
      domain: null,
    });

    expect(report.matches.map((match) => match.similarity)).not.toContain(1);
  });

  it('reports a weakened check instead of a confident empty answer', async () => {
    const report = await findDuplicates({
      title: TITLE,
      description: BODY,
      districtCode: 'RAN',
      domain: null,
    });

    expect(report).toHaveProperty('degraded');
    expect(typeof report.degraded).toBe('boolean');
  });
});

describe('the fingerprint itself', () => {
  it('ignores case, punctuation, word order and filler words', () => {
    const a = contentFingerprint('Broken handpump in the ward', 'It has been broken for weeks.');
    const b = contentFingerprint('HANDPUMP BROKEN, ward!', 'Weeks it has been broken for...');
    expect(a).toBe(b);
  });

  it('separates reports that share only a few words', () => {
    const a = contentFingerprint(TITLE, BODY);
    const b = contentFingerprint(
      'Upper primary school has had no science teacher since June',
      'The school lost its only science teacher in June and nobody has replaced them since then.',
    );
    expect(a).not.toBe(b);
  });

  it('refuses to fingerprint text too short to be meaningful', () => {
    expect(contentFingerprint('a', 'b')).toBeNull();
  });
});
