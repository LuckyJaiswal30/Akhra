import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb, outcomes, projects, withoutRls } from '@akhra/db';
import { computeDashboard, csvCell, exportReportsCsv } from '@/modules/analytics';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  createOrg,
  createReport,
  createUser,
  type TestUser,
} from '../helpers';

let stateOfficer: TestUser;
let ranchiOfficer: TestUser;

async function as(user: TestUser) {
  actAs(user);
  return getActor();
}

beforeAll(async () => {
  stateOfficer = await createUser({ role: 'gov_admin' });
  ranchiOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });

  const university = await createOrg('university');
  const problemId = await createReport({
    districtCode: 'LAT',
    domain: 'energy',
    status: 'deployed',
    title: '=HYPERLINK("http://example.invalid","click")',
  });
  const [project] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(projects)
      .values({
        problemId,
        organizationId: university,
        title: 'Solar pumps for Latehar',
        summary: 'Solar irrigation pumps on six farms.',
        status: 'deployed',
      })
      .returning({ id: projects.id }),
  );
  await withoutRls(getDb(), (tx) =>
    tx.insert(outcomes).values([
      {
        projectId: project!.id,
        outcomeType: 'patent',
        title: 'Pump controller',
        ipStatus: 'filed',
      },
      { projectId: project!.id, outcomeType: 'startup', title: 'Surya Pump Services' },
      {
        projectId: project!.id,
        outcomeType: 'deployment',
        title: 'Six farms irrigated',
        impactMetricName: 'Farmers served',
        impactMetricValue: '48',
      },
    ]),
  );
});

afterAll(cleanupTestData);

describe('the state dashboard', () => {
  it('counts patents, startups and people reached from recorded outcomes', async () => {
    const dashboard = await computeDashboard(await as(stateOfficer), { districtCode: 'LAT' });

    expect(dashboard.kpis).toMatchObject({ patents: 1, startups: 1, communityReach: 48 });
    expect(dashboard.sectorDistricts).toContainEqual({
      districtCode: 'LAT',
      domain: 'energy',
      total: 1,
    });
    expect(Date.now() - new Date(dashboard.computedAt).getTime()).toBeLessThan(60_000);
  });
});

describe('exporting reports', () => {
  it('neutralises a title that a spreadsheet would run as a formula', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvCell('Handpump, broken')).toBe('"Handpump, broken"');
    expect(csvCell('He said "no"')).toBe('"He said ""no"""');
  });

  it('gives a district officer only their own district, whatever they ask for', async () => {
    await createReport({ districtCode: 'RAN', title: 'Ranchi report for export' });
    const csv = await exportReportsCsv(await as(ranchiOfficer), { districtCode: 'LAT' });

    expect(csv).toContain('Ranchi report for export');
    expect(csv).not.toContain('HYPERLINK');
  });

  it('writes the hostile title safely for a state officer', async () => {
    const csv = await exportReportsCsv(await as(stateOfficer), { districtCode: 'LAT' });
    expect(csv).toContain(`"'=HYPERLINK(""http://example.invalid"",""click"")"`);
  });
});
