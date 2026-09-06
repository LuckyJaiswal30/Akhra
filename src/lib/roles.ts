export const ROLES = [
  "citizen",
  "officer",
  "faculty",
  "student",
  "industry",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  citizen: "Citizen",
  officer: "Government officer",
  faculty: "Faculty",
  student: "Student",
  industry: "Industry partner",
};

export const ROLE_BLURB: Record<Role, string> = {
  citizen: "Report a problem in your area and follow what happens to it.",
  officer: "Validate incoming reports and route them to the right institution.",
  faculty: "Take on assigned challenges and form student project teams.",
  student: "Work on an assigned challenge and log project milestones.",
  industry: "Back university proposals with mentoring, funding or prototyping.",
};

export type NavItem = {
  href: string;
  label: string;
  roles: readonly Role[];
};

export const NAV: NavItem[] = [
  { href: "/report", label: "Report a problem", roles: ["citizen"] },
  { href: "/my-reports", label: "My reports", roles: ["citizen"] },
  { href: "/queue", label: "Validation queue", roles: ["officer"] },
  { href: "/challenges", label: "Challenges", roles: ["faculty", "student"] },
  { href: "/projects", label: "Projects", roles: ["faculty", "student"] },
  { href: "/proposals", label: "Open proposals", roles: ["industry"] },
  { href: "/pledges", label: "Our pledges", roles: ["industry"] },
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["officer", "faculty", "student", "industry", "citizen"],
  },
];

export const ROLE_HOME: Record<Role, string> = {
  citizen: "/report",
  officer: "/queue",
  faculty: "/challenges",
  student: "/challenges",
  industry: "/proposals",
};
