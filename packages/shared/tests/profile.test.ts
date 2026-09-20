import { describe, expect, it } from 'vitest';
import { profileGaps, readSignupDetails } from '../src/profile';

const complete = {
  role: 'citizen' as const,
  name: 'Sunita Devi',
  phone: '9835044444',
  districtCode: 'GUM',
  privacyAcceptedAt: new Date(),
};

describe('what an account needs before it can use Akhra', () => {
  it('has nothing missing when a citizen has a name, mobile, district and consent', () => {
    expect(profileGaps(complete)).toEqual([]);
  });

  it('lists every gap of a fresh Google account, in the order the screen asks', () => {
    expect(
      profileGaps({ ...complete, phone: null, districtCode: null, privacyAcceptedAt: null }),
    ).toEqual(['phone', 'district', 'consent']);
  });

  it('asks citizens for a district but not invited staff', () => {
    expect(profileGaps({ ...complete, districtCode: null })).toEqual(['district']);
    expect(profileGaps({ ...complete, role: 'faculty', districtCode: null })).toEqual([]);
  });

  it('treats a malformed mobile or unknown district as missing', () => {
    expect(profileGaps({ ...complete, phone: '12345', districtCode: 'XYZ' })).toEqual([
      'phone',
      'district',
    ]);
  });
});

describe('sign-up details read back from Clerk', () => {
  const now = new Date('2026-09-16T12:00:00Z');

  it('keeps valid values, tidying a mobile number typed with +91', () => {
    expect(
      readSignupDetails(
        {
          phone: '+91 98350 44444',
          districtCode: 'RAN',
          acceptedPrivacyNoticeAt: '2026-09-16T11:59:00Z',
        },
        now,
      ),
    ).toEqual({
      phone: '9835044444',
      districtCode: 'RAN',
      acceptedPrivacyAt: new Date('2026-09-16T11:59:00Z'),
    });
  });

  it('drops anything tampered with, since the browser wrote it', () => {
    expect(
      readSignupDetails(
        { phone: '1234', districtCode: 'NOWHERE', acceptedPrivacyNoticeAt: 'yesterday' },
        now,
      ),
    ).toEqual({
      phone: null,
      districtCode: null,
      acceptedPrivacyAt: null,
    });
    expect(
      readSignupDetails({ acceptedPrivacyNoticeAt: '2027-01-01T00:00:00Z' }, now).acceptedPrivacyAt,
    ).toBeNull();
  });

  it('is empty for a Google sign-up, which writes no metadata', () => {
    expect(readSignupDetails(undefined, now)).toEqual({
      phone: null,
      districtCode: null,
      acceptedPrivacyAt: null,
    });
  });
});
