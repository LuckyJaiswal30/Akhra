export const ROLES = [
  'citizen',
  'university_admin',
  'faculty',
  'student',
  'industry_admin',
  'industry_partner',
  'dept_officer',
  'gov_admin',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, { en: string; hi: string }> = {
  citizen: { en: 'Citizen', hi: 'नागरिक' },
  university_admin: { en: 'University Administrator', hi: 'विश्वविद्यालय प्रशासक' },
  faculty: { en: 'Faculty', hi: 'संकाय सदस्य' },
  student: { en: 'Student', hi: 'विद्यार्थी' },
  industry_admin: { en: 'Industry Administrator', hi: 'उद्योग प्रशासक' },
  industry_partner: { en: 'Industry Partner', hi: 'उद्योग भागीदार' },
  dept_officer: { en: 'Department Officer', hi: 'विभागीय अधिकारी' },
  gov_admin: { en: 'Government Officer', hi: 'सरकारी पदाधिकारी' },
  super_admin: { en: 'Super Administrator', hi: 'सुपर प्रशासक' },
};

export const ORGANIZATION_TYPES = [
  'university',
  'industry',
  'government',
  'urban_local_body',
  'panchayati_raj',
  'ngo',
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

/**
 * What kind of industry partner an organisation is. They bring different things: a startup builds, a
 * CSR foundation funds, a research lab tests, an innovation hub connects. Set when the partner is
 * onboarded, from its registration, and shown wherever its offers are weighed.
 */
export const PARTNER_KINDS = [
  'corporate',
  'startup',
  'msme',
  'csr_foundation',
  'research_lab',
  'innovation_hub',
] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];

export const PARTNER_KIND_LABELS: Record<PartnerKind, { en: string; hi: string }> = {
  corporate: { en: 'Company', hi: 'कंपनी' },
  startup: { en: 'Startup', hi: 'स्टार्टअप' },
  msme: { en: 'MSME', hi: 'एमएसएमई' },
  csr_foundation: { en: 'CSR foundation', hi: 'सीएसआर फ़ाउंडेशन' },
  research_lab: { en: 'Research laboratory', hi: 'अनुसंधान प्रयोगशाला' },
  innovation_hub: { en: 'Innovation hub', hi: 'नवाचार केंद्र' },
};

/** Who speaks for the institution: answers referrals, forms teams, submits proposals. */
export const UNIVERSITY_ROLES = ['university_admin', 'faculty'] as const satisfies readonly Role[];

/** Everyone who belongs to an institution, students included. */
export const INSTITUTION_ROLES = [
  ...UNIVERSITY_ROLES,
  'student',
] as const satisfies readonly Role[];
export const INDUSTRY_ROLES = [
  'industry_admin',
  'industry_partner',
] as const satisfies readonly Role[];
export const GOVERNMENT_ROLES = [
  'dept_officer',
  'gov_admin',
  'super_admin',
] as const satisfies readonly Role[];
export const DISTRICT_ROLES = ['gov_admin', 'super_admin'] as const satisfies readonly Role[];
export const ORG_ADMIN_ROLES = [
  'university_admin',
  'industry_admin',
] as const satisfies readonly Role[];

export const DEPARTMENT_ORG_TYPES = [
  'government',
  'urban_local_body',
  'panchayati_raj',
] as const satisfies readonly OrganizationType[];

export const ORG_BOUND_ROLES: readonly Role[] = [
  ...INSTITUTION_ROLES,
  ...INDUSTRY_ROLES,
  'dept_officer',
];

export const ROLE_HOME_PATH = {
  citizen: '/dashboard',
  university_admin: '/university',
  faculty: '/university',
  student: '/university/projects',
  industry_admin: '/industry',
  industry_partner: '/industry',
  dept_officer: '/department',
  gov_admin: '/government',
  super_admin: '/admin',
} as const satisfies Record<Role, string>;

export const ROLE_RANK: Record<Role, number> = {
  citizen: 10,
  student: 20,
  faculty: 40,
  industry_partner: 40,
  university_admin: 60,
  industry_admin: 60,
  dept_officer: 70,
  gov_admin: 80,
  super_admin: 100,
};

export const ROLE_ORGANIZATION_TYPE: Partial<Record<Role, OrganizationType>> = {
  university_admin: 'university',
  faculty: 'university',
  student: 'university',
  industry_admin: 'industry',
  industry_partner: 'industry',
  dept_officer: 'government',
  gov_admin: 'government',
};

export const FIRST_ADMIN_ROLE = {
  university: 'university_admin',
  industry: 'industry_admin',
} as const satisfies Record<'university' | 'industry', Role>;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function hasAnyRole(role: Role | undefined | null, allowed: readonly Role[]): boolean {
  return role != null && allowed.includes(role);
}

export interface InviteDecision {
  allowed: boolean;
  reason?: string;
}

export function canIssueInvite(
  inviter: { role: Role; organizationId: string | null },
  invite: { role: Role; organizationId: string | null },
): InviteDecision {
  if (invite.role === 'super_admin') {
    return { allowed: false, reason: 'Super administrator access is never granted by invitation.' };
  }
  if (invite.role === 'citizen') {
    return { allowed: false, reason: 'Citizens create their own accounts; they are not invited.' };
  }

  if (inviter.role === 'super_admin') {
    if (invite.role === 'dept_officer' && !invite.organizationId) {
      return { allowed: false, reason: 'A department officer must be attached to a department.' };
    }
    if (
      invite.role === 'gov_admin' ||
      invite.role === 'dept_officer' ||
      (ORG_ADMIN_ROLES as readonly Role[]).includes(invite.role)
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Colleagues are invited by their own organisation’s administrator.',
    };
  }

  if (!(ORG_ADMIN_ROLES as readonly Role[]).includes(inviter.role)) {
    return { allowed: false, reason: 'Your role cannot invite people.' };
  }
  if (!inviter.organizationId || invite.organizationId !== inviter.organizationId) {
    return { allowed: false, reason: 'You can only invite people into your own organisation.' };
  }
  if (ROLE_ORGANIZATION_TYPE[invite.role] !== ROLE_ORGANIZATION_TYPE[inviter.role]) {
    return { allowed: false, reason: 'That role does not belong to your kind of organisation.' };
  }
  if (ROLE_RANK[invite.role] > ROLE_RANK[inviter.role]) {
    return { allowed: false, reason: 'You cannot grant a role above your own.' };
  }
  return { allowed: true };
}
