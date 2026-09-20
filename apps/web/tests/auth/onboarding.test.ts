import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, users, withoutRls } from '@akhra/db';
import {
  completeProfileAction,
  getOwnProfile,
  getProfileGaps,
  updateProfileAction,
} from '@/modules/auth';
import { getActor } from '@/server/session';
import {
  actAs,
  actAsClerk,
  cleanupTestData,
  createOrg,
  createUser,
  formData,
  resetClerkFake,
  uniqueEmail,
  verifiedIdentity,
} from '../helpers';

const NO_DETAILS = { phone: null, districtCode: null, acceptedPrivacyAt: null };

async function stored(email: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        phone: users.phone,
        districtCode: users.districtCode,
        privacyAcceptedAt: users.privacyAcceptedAt,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, email)),
  );
  return row;
}

beforeEach(() => {
  resetClerkFake();
  actAs(null);
});
afterAll(cleanupTestData);

describe('an account made with Akhra’s own sign-up form', () => {
  it('starts complete: mobile, district and consent come across from sign-up', async () => {
    const email = uniqueEmail('form-signup');
    const accepted = new Date(Date.now() - 60_000);
    actAsClerk(
      verifiedIdentity(email, {
        name: 'Sunita Devi',
        signup: { phone: '9835044444', districtCode: 'GUM', acceptedPrivacyAt: accepted },
      }),
    );

    const actor = await getActor();

    expect(await stored(email)).toMatchObject({ phone: '9835044444', districtCode: 'GUM' });
    expect((await stored(email))?.privacyAcceptedAt?.getTime()).toBe(accepted.getTime());
    expect(await getProfileGaps(actor)).toEqual([]);
  });

  it('fills a reserved account’s blanks from sign-up without overwriting what an administrator set', async () => {
    const reserved = await createUser({
      role: 'faculty',
      organizationId: await createOrg('university'),
      linked: false,
    });
    await withoutRls(getDb(), (tx) =>
      tx.update(users).set({ phone: '9000000001' }).where(eq(users.id, reserved.id)),
    );
    actAsClerk(
      verifiedIdentity(reserved.email, {
        signup: { phone: '9835044444', districtCode: 'RAN', acceptedPrivacyAt: new Date() },
      }),
    );

    const actor = await getActor();

    expect(await stored(reserved.email)).toMatchObject({
      phone: '9000000001',
      districtCode: 'RAN',
      role: 'faculty',
    });
    expect(await getProfileGaps(actor)).toEqual([]);
  });
});

describe('an account made with Google, from either tab', () => {
  it('is let in only after the profile screen: it has a name and email but no mobile, district or consent', async () => {
    const email = uniqueEmail('google');
    actAsClerk(verifiedIdentity(email, { name: 'Lucky Jaiswal', signup: NO_DETAILS }));

    expect(await getProfileGaps(await getActor())).toEqual(['phone', 'district', 'consent']);
  });

  it('is complete once the profile screen is saved, with consent recorded', async () => {
    const email = uniqueEmail('google-complete');
    actAsClerk(verifiedIdentity(email, { name: 'Lucky Jaiswal', signup: NO_DETAILS }));
    await getActor();

    const result = await completeProfileAction(
      null,
      formData({
        name: 'Lucky Jaiswal',
        phone: '+91 98350 44444',
        districtCode: 'RAN',
        locality: 'Kanke',
        acceptTerms: 'on',
      }),
    );

    expect(result?.ok).toBe(true);
    expect(await stored(email)).toMatchObject({ phone: '9835044444', districtCode: 'RAN' });
    expect((await stored(email))?.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(await getProfileGaps(await getActor())).toEqual([]);
  });

  it('cannot skip consent', async () => {
    actAsClerk(verifiedIdentity(uniqueEmail('google-no-consent'), { signup: NO_DETAILS }));
    await getActor();

    const result = await completeProfileAction(
      null,
      formData({ name: 'Test Person', phone: '9835044444', districtCode: 'RAN' }),
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    expect(result?.ok === false && result.error.details?.fields?.acceptTerms).toBeTruthy();
  });

  it('cannot skip the district as a citizen, or send a mobile number that is not Indian', async () => {
    actAsClerk(verifiedIdentity(uniqueEmail('google-bad'), { signup: NO_DETAILS }));
    await getActor();

    const noDistrict = await completeProfileAction(
      null,
      formData({ name: 'Test Person', phone: '9835044444', acceptTerms: 'on' }),
    );
    const badPhone = await completeProfileAction(
      null,
      formData({ name: 'Test Person', phone: '12345', districtCode: 'RAN', acceptTerms: 'on' }),
    );

    expect(noDistrict?.ok === false && noDistrict.error.details?.fields?.districtCode).toBeTruthy();
    expect(badPhone?.ok === false && badPhone.error.details?.fields?.phone).toBeTruthy();
  });

  it('keeps the first moment of consent when the screen is saved again', async () => {
    const earlier = new Date('2026-03-01T10:00:00Z');
    actAsClerk(
      verifiedIdentity(uniqueEmail('consent-kept'), {
        signup: { phone: null, districtCode: null, acceptedPrivacyAt: earlier },
      }),
    );
    const actor = await getActor();

    await completeProfileAction(
      null,
      formData({ name: 'Test Person', phone: '9835044444', districtCode: 'RAN' }),
    );

    expect((await getOwnProfile(actor))?.privacyAcceptedAt?.toISOString()).toBe(
      earlier.toISOString(),
    );
  });
});

describe('the account page after sign-up', () => {
  it('will not let a citizen clear their mobile number or district, which would lock them out', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    const noPhone = await updateProfileAction(
      null,
      formData({ name: 'Test Person', phone: '', districtCode: 'RAN' }),
    );
    const noDistrict = await updateProfileAction(
      null,
      formData({ name: 'Test Person', phone: '9835044444', districtCode: '' }),
    );

    expect(noPhone?.ok === false && noPhone.error.details?.fields?.phone).toBeTruthy();
    expect(noDistrict?.ok === false && noDistrict.error.details?.fields?.districtCode).toBeTruthy();
  });

  it('does not ask invited staff for a district', async () => {
    const staff = await createUser({
      role: 'industry_admin',
      organizationId: await createOrg('industry'),
    });
    actAs(staff);

    const result = await updateProfileAction(
      null,
      formData({ name: 'Test Person', phone: '9835044444', districtCode: '' }),
    );

    expect(result?.ok).toBe(true);
  });
});
