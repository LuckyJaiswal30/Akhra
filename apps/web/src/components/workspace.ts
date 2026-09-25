import type { Role } from '@akhra/shared';
import type { NavItem } from './nav-links';

export const DASHBOARD_HREF: Record<Role, NavItem['href']> = {
  citizen: '/dashboard',
  student: '/university/projects',
  faculty: '/university',
  university_admin: '/university',
  industry_partner: '/industry',
  industry_admin: '/industry',
  dept_officer: '/department',
  gov_admin: '/government',
  super_admin: '/admin',
};
