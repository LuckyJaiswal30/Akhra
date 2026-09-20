import { afterAll, describe, expect, it } from 'vitest';
import { normalizePhone, splitName } from '@akhra/shared';
import { getOwnProfile, updateProfileAction } from '@/modules/auth';
import { getActor } from '@/server/session';
import { actAs, cleanupTestData, createUser, formData } from '../helpers';

afterAll(cleanupTestData);

describe('a person’s own account details', () => {
  it('loads the stored details for the signed-in person, not a blank form', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    const profile = await getOwnProfile(await getActor());

    expect(profile).toMatchObject({
      name: citizen.name,
      email: citizen.email,
      phone: null,
      districtCode: null,
    });
  });

  it('saves name, phone, district and locality, and reads them back', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    const result = await updateProfileAction(
      null,
      formData({
        name: 'Sunita Devi',
        phone: '9835044444',
        districtCode: 'GUM',
        locality: 'Bharno',
      }),
    );

    expect(result?.ok).toBe(true);
    expect(await getOwnProfile(await getActor())).toMatchObject({
      name: 'Sunita Devi',
      phone: '9835044444',
      districtCode: 'GUM',
      locality: 'Bharno',
    });
  });

  it('refuses a phone number that is not a ten-digit Indian mobile', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    const result = await updateProfileAction(
      null,
      formData({ name: 'Sunita Devi', phone: '12345' }),
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    expect(result?.ok === false && result.error.details?.fields?.phone).toBeTruthy();
  });

  it('accepts a mobile number typed with the country code, spaces or dashes', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    const result = await updateProfileAction(
      null,
      formData({ name: 'Sunita Devi', phone: '+91 98350-44444', districtCode: 'GUM' }),
    );

    expect(result?.ok).toBe(true);
    expect((await getOwnProfile(await getActor()))?.phone).toBe('9835044444');
  });

  it('refuses to save anything when nobody is signed in', async () => {
    actAs(null);

    const result = await updateProfileAction(null, formData({ name: 'Nobody At All' }));

    expect(result).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  });

  it('has nothing to show when nobody is signed in', async () => {
    actAs(null);
    expect(await getOwnProfile(await getActor())).toBeNull();
  });
});

describe('how a typed mobile number is read', () => {
  it('drops separators and a leading +91 or 0, and nothing else', () => {
    expect(normalizePhone('9835044444')).toBe('9835044444');
    expect(normalizePhone('+91 98350 44444')).toBe('9835044444');
    expect(normalizePhone('919835044444')).toBe('9835044444');
    expect(normalizePhone('09835044444')).toBe('9835044444');
    expect(normalizePhone('(98350) 44444')).toBe('9835044444');
    expect(normalizePhone('')).toBe('');
  });

  it('leaves anything that is not a number for the validator to refuse', () => {
    expect(normalizePhone('98350abcde')).toBe('98350abcde');
    expect(normalizePhone('12345')).toBe('12345');
  });
});

describe('the name Clerk is given', () => {
  it('splits a full name into the first and last name Clerk stores', () => {
    expect(splitName('Anita Verma')).toEqual({ firstName: 'Anita', lastName: 'Verma' });
    expect(splitName('  Rakesh  Kumar Oraon ')).toEqual({
      firstName: 'Rakesh',
      lastName: 'Kumar Oraon',
    });
    expect(splitName('Meera')).toEqual({ firstName: 'Meera', lastName: '' });
    expect(splitName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});
