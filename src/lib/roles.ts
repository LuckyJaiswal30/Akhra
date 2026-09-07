export const ROLES = [
  "admin",
  "citizen",
  "officer",
  "faculty",
  "student",
  "industry",
] as const;

export type Role = (typeof ROLES)[number];

export const INVITABLE_ROLES = [
  "officer",
  "faculty",
  "student",
  "industry",
  "admin",
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  citizen: "Citizen",
  officer: "District officer",
  faculty: "Faculty",
  student: "Student",
  industry: "Industry partner",
};

export const ROLE_EVIDENCE: Record<InvitableRole, string> = {
  officer:
    "Check their posting and district against an official source first. Officers can see the exact spot a citizen reported from, so this is the one to be strict about.",
  faculty: "Check that they actually teach at the institution you are attaching them to.",
  student: "Check that they are enrolled at the institution.",
  industry: "Check that they represent the organisation.",
  admin:
    "Only for someone who should be able to hand out access to others. Keep this list short.",
};

export type NavItem = {
  href: string;
  label: string;
  roles: readonly Role[];
};

export const NAV: NavItem[] = [
  { href: "/report", label: "Report a problem", roles: ["citizen"] },
  { href: "/my-reports", label: "My reports", roles: ["citizen"] },
  { href: "/queue", label: "To verify", roles: ["officer"] },
  {
    href: "/challenges",
    label: "Open challenges",
    roles: ["faculty", "student"],
  },
  { href: "/projects", label: "Our projects", roles: ["faculty", "student"] },
  { href: "/proposals", label: "Proposals", roles: ["industry"] },
  { href: "/pledges", label: "What we backed", roles: ["industry"] },
  {
    href: "/dashboard",
    label: "How it is going",
    roles: ["admin", "officer", "faculty", "student", "industry", "citizen"],
  },
  {
    href: "/administration",
    label: "Access",
    roles: ["admin"],
  },
];

export const ROLE_HOME: Record<Role, string> = {
  admin: "/administration",
  citizen: "/report",
  officer: "/queue",
  faculty: "/challenges",
  student: "/challenges",
  industry: "/proposals",
};
