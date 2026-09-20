import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb, problems, projects, withoutRls } from '@akhra/db';
import { classifyProblem } from '@/modules/classification';
import { submitProblemAction } from '@/modules/citizen';
import { advanceProjectAction } from '@/modules/lifecycle';
import { POST as upload } from '@/app/api/uploads/route';
import { POST as issueInvite } from '@/app/api/v1/invites/route';
import { GET as health } from '@/app/api/health/route';
import { apiRoute, runAction } from '@/server/api';
import {
  actAs,
  callMultipart,
  callRoute,
  cleanupTestData,
  createOrg,
  createUser,
  formData,
  type TestUser,
} from '../helpers';

const validReport = (): Record<string, string> => ({
  title: 'Handpump water has turned yellow in our ward',
  description:
    'The handpump that serves about sixty households now gives yellow water with a strong iron smell.',
  districtCode: 'RAN',
  submitterName: 'Test Reporter',
  submitterPhone: '9835012345',
  consentToPublish: 'on',
});

const pdfHeader = '%PDF-1.4\n';

async function stillHealthy(): Promise<void> {
  const res = await callRoute(health, { method: 'GET' });
  expect(res.status).toBe(200);
  expect(res.body?.data).toMatchObject({ status: 'ok', database: 'ok' });
}

let govAdmin: TestUser;
let projectId: string;

beforeAll(async () => {
  const org = await createOrg('university');
  govAdmin = await createUser({ role: 'gov_admin' });
  await withoutRls(getDb(), async (tx) => {
    const [problem] = await tx
      .insert(problems)
      .values({
        refCode: `AKH-9998-${String(Math.floor(Math.random() * 999_999)).padStart(6, '0')}`,
        title: 'Error path test report',
        description: 'A description long enough to be realistic for an error-path test fixture.',
        districtCode: 'RAN',
        submitterName: 'Test Reporter',
        submitterPhone: '9800000000',
        status: 'in_progress',
      })
      .returning({ id: problems.id });
    const [project] = await tx
      .insert(projects)
      .values({
        problemId: problem!.id,
        organizationId: org,
        title: 'Error path test project',
        summary: 'A project used to exercise illegal stage changes.',
        status: 'in_progress',
      })
      .returning({ id: projects.id });
    projectId = project!.id;
  });
});

afterAll(cleanupTestData);

describe('a citizen report with problems gets field-level answers', () => {
  it('names the missing district', async () => {
    actAs(null);
    const { districtCode: _omit, ...withoutDistrict } = validReport();
    const result = await submitProblemAction(null, formData(withoutDistrict));

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    expect(result?.ok === false && result.error.details?.fields?.districtCode).toBeTruthy();
    await stillHealthy();
  });

  it('explains a description that is too short', async () => {
    actAs(null);
    const result = await submitProblemAction(
      null,
      formData({ ...validReport(), description: 'Too short' }),
    );

    expect(result?.ok === false && result.error.details?.fields?.description).toMatch(
      /50 characters/,
    );
  });

  it('reports every problem at once, not just the first', async () => {
    actAs(null);
    const result = await submitProblemAction(null, formData({ consentToPublish: 'on' }));
    const fields = result?.ok === false ? Object.keys(result.error.details?.fields ?? {}) : [];

    expect(fields).toEqual(
      expect.arrayContaining([
        'title',
        'description',
        'districtCode',
        'submitterName',
        'submitterPhone',
      ]),
    );
  });
});

describe('uploads are refused with the reason, and nothing crashes', () => {
  it('refuses a file over the size limit with 413', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(new TextEncoder().encode(pdfHeader));
    const data = new FormData();
    data.append('file', new File([big], 'report.pdf', { type: 'application/pdf' }));
    const res = await callMultipart(upload, data);

    expect(res.status).toBe(413);
    expect(res.body?.error).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    expect(res.body?.error.message).toMatch(/10 MB/);
    await stillHealthy();
  });

  it('refuses a script disguised as a PDF with 415', async () => {
    const data = new FormData();
    data.append(
      'file',
      new File(['#!/bin/sh\necho pwned\n'], 'invoice.pdf', { type: 'application/pdf' }),
    );
    const res = await callMultipart(upload, data);

    expect(res.status).toBe(415);
    expect(res.body?.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('refuses an unsupported type with 415 and says what is accepted', async () => {
    const data = new FormData();
    data.append('file', new File(['plain text'], 'notes.txt', { type: 'text/plain' }));
    const res = await callMultipart(upload, data);

    expect(res.status).toBe(415);
    expect(res.body?.error.message).toMatch(/photo|PDF/);
  });

  it('asks for a file when none was sent', async () => {
    const res = await callMultipart(upload, new FormData());

    expect(res.status).toBe(400);
    expect(res.body?.error.details.fields.file).toBeTruthy();
  });
});

describe('malformed requests and illegal moves', () => {
  it('answers malformed JSON with INVALID_JSON', async () => {
    const admin = await createUser({ role: 'super_admin' });
    actAs(admin);
    const res = await callRoute(issueInvite, { rawBody: '{"email":' });

    expect(res.status).toBe(400);
    expect(res.body?.error.code).toBe('INVALID_JSON');
  });

  it('calls an impossible stage jump an invalid transition, not a permissions problem', async () => {
    actAs(govAdmin);
    const result = await advanceProjectAction(null, formData({ projectId, toStatus: 'deployed' }));

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_TRANSITION' } });
  });

  it('turns a garbage id into a validation error instead of a database failure', async () => {
    actAs(govAdmin);
    const result = await advanceProjectAction(
      null,
      formData({ projectId: 'not-a-uuid', toStatus: 'prototyped' }),
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
  });
});

describe('the classifier refuses malformed input safely', () => {
  it.each([
    ['empty text', { title: '', description: '' }],
    ['non-string values', { title: 42, description: { nested: true } }],
    ['an oversized description', { title: 'A reasonable title', description: 'x'.repeat(50_000) }],
  ])('rejects %s with a validation error', async (_label, input) => {
    await expect(classifyProblem(input as never)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('still classifies normally afterwards', async () => {
    const result = await classifyProblem({
      title: 'Primary health centre has no doctor at night',
      description:
        'Pregnant women are taken forty kilometres to the district hospital because no doctor is posted at night.',
    });

    expect(result.domain).toBe('healthcare');
  });
});

describe('unexpected failures never leak internals', () => {
  it('turns an unknown exception in a route into a safe 500 with a reference', async () => {
    const exploding = apiRoute(async () => {
      throw new Error('connection string postgres://secret@internal-host leaked at /srv/app.ts:12');
    });
    const res = await callRoute(exploding, { method: 'GET' });
    const text = JSON.stringify(res.body);

    expect(res.status).toBe(500);
    expect(res.body?.error.code).toBe('INTERNAL_ERROR');
    expect(res.body?.error.details.referenceId).toMatch(/^[0-9a-f]{8}$/);
    expect(res.body?.error.message).toContain(res.body?.error.details.referenceId);
    expect(text).not.toMatch(/secret|internal-host|app\.ts|\bat\b.*:\d+/);
    await stillHealthy();
  });

  it('does the same for a server action', async () => {
    const result = await runAction('test', async () => {
      throw new TypeError(`Cannot read properties of undefined (reading '${randomUUID()}')`);
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
    expect(JSON.stringify(result)).not.toMatch(/Cannot read properties/);
    await stillHealthy();
  });
});
