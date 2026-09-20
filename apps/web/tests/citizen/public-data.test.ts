import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, problems, withoutRls } from '@akhra/db';
import { trackByRefCode } from '@/modules/citizen';

const APP_ROOT = join(__dirname, '../..');
const PUBLIC_SOURCES = [
  'src/app/[locale]/(public)',
  'src/modules/citizen/components',
  'src/modules/citizen/queries.ts',
].map((path) => join(APP_ROOT, path));

function filesUnder(path: string): string[] {
  return statSync(path).isDirectory()
    ? readdirSync(path).flatMap((entry) => filesUnder(join(path, entry)))
    : [path];
}

const REF_CODE = 'AKH-9998-000301';

afterAll(async () => {
  await withoutRls(getDb(), (tx) => tx.delete(problems).where(eq(problems.refCode, REF_CODE)));
});

describe('what the public can see about a report', () => {
  it('never includes which AI provider classified it', async () => {
    await withoutRls(getDb(), (tx) =>
      tx.insert(problems).values({
        refCode: REF_CODE,
        title: 'Classified report used to check what the tracker reveals',
        description: 'A report the AI classifier has already labelled, with its provider recorded.',
        districtCode: 'RAN',
        domain: 'water_resources',
        domainConfidence: 0.91,
        classifiedBy: 'gemini',
        submitterName: 'Public Data Fixture',
        submitterPhone: '9835077777',
      }),
    );

    const problem = await trackByRefCode(REF_CODE);

    expect(problem).not.toBeNull();
    expect(Object.keys(problem!)).not.toContain('classifiedBy');
    expect(Object.keys(problem!)).not.toContain('domainConfidence');
  });

  it('has no public page or citizen component that reads classifier provenance', () => {
    const offenders = PUBLIC_SOURCES.flatMap(filesUnder).filter((file) =>
      /classifiedBy|domainConfidence/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
