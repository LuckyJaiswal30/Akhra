import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { suggestOrganizations } from '@/modules/classification';
import {
  getInstitutionProfile,
  setFacultyExpertise,
  updateInstitutionProfile,
} from '@/modules/university';
import { getActor } from '@/server/session';
import { actAs, cleanupTestData, createOrg, createUser, type TestUser } from '../helpers';

let university: string;
let otherUniversity: string;
let admin: TestUser;
let faculty: TestUser;
let outsider: TestUser;

async function as(user: TestUser) {
  actAs(user);
  return getActor();
}

beforeAll(async () => {
  university = await createOrg('university');
  otherUniversity = await createOrg('university');
  admin = await createUser({ role: 'university_admin', organizationId: university });
  faculty = await createUser({ role: 'faculty', organizationId: university });
  outsider = await createUser({ role: 'university_admin', organizationId: otherUniversity });
});

afterAll(cleanupTestData);

describe('an institution’s profile decides whether it is routed anything', () => {
  it('starts empty, and a university with no profile is never suggested', async () => {
    const profile = await getInstitutionProfile(await as(admin));
    expect(profile.isRoutable).toBe(false);

    const suggestions = await suggestOrganizations({
      domain: 'energy',
      districtCode: 'RAN',
      limit: 50,
    });
    expect(suggestions.map((s) => s.organizationId)).not.toContain(university);
  });

  it('is suggested once it records the area, with every reason in the rationale', async () => {
    await updateInstitutionProfile(await as(admin), {
      description: 'Solar and micro-grid research for rural Jharkhand.',
      domains: [{ domain: 'energy', strength: 5 }],
      disciplines: ['electrical_engineering'],
      facilities: ['testing_lab', 'incubation_centre'],
    });
    await setFacultyExpertise(await as(admin), faculty.id, {
      discipline: 'electrical_engineering',
      specialisation: 'Rural micro-grids',
    });

    const suggestions = await suggestOrganizations({
      domain: 'energy',
      districtCode: 'RAN',
      limit: 50,
    });
    const ours = suggestions.find((s) => s.organizationId === university);

    expect(ours).toBeDefined();
    expect(ours!.rationale).toContain('Energy');
    expect(ours!.rationale).toContain('5/5');
    expect(ours!.rationale).toContain('Electrical engineering');
    expect(ours!.rationale).toContain('faculty in these fields');
    expect(ours!.rationale).toContain('Testing laboratory');
  });

  it('lets faculty read the profile but not change it', async () => {
    const team = await as(faculty);
    expect((await getInstitutionProfile(team)).domains).toEqual([
      { domain: 'energy', strength: 5 },
    ]);

    await expect(
      updateInstitutionProfile(team, {
        description: '',
        domains: [{ domain: 'healthcare', strength: 5 }],
        disciplines: ['medicine_public_health'],
        facilities: [],
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('does not let another institution record a discipline for someone who is not its staff', async () => {
    await expect(
      setFacultyExpertise(await as(outsider), faculty.id, { discipline: 'education' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
