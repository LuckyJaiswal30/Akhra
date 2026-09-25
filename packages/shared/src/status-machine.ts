import type { Role } from './roles';

export const PROBLEM_STATUSES = [
  'submitted',
  'validated',
  'assigned',
  'action_taken',
  'routed',
  'in_progress',
  'prototyped',
  'piloted',
  'deployed',
  'closed',
  'rejected',
  'duplicate',
  'on_hold',
] as const;

export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const TERMINAL_STATUSES: readonly ProblemStatus[] = ['closed', 'rejected', 'duplicate'];

export const ACTIVE_STATUSES: readonly ProblemStatus[] = [
  'submitted',
  'validated',
  'assigned',
  'action_taken',
  'routed',
  'in_progress',
  'prototyped',
  'piloted',
  'deployed',
];

export interface StatusDefinition {
  id: ProblemStatus;
  labelEn: string;
  labelHi: string;
  trackerStep: number | null;
  description: string;
}

export const STATUS_DEFINITIONS: Record<ProblemStatus, StatusDefinition> = {
  submitted: {
    id: 'submitted',
    labelEn: 'Submitted',
    labelHi: 'प्रस्तुत',
    trackerStep: 1,
    description: 'Received and awaiting government validation.',
  },
  validated: {
    id: 'validated',
    labelEn: 'Validated',
    labelHi: 'सत्यापित',
    trackerStep: 2,
    description: 'Verified as a genuine, actionable challenge.',
  },
  assigned: {
    id: 'assigned',
    labelEn: 'With the department',
    labelHi: 'विभाग के पास',
    trackerStep: 3,
    description: 'Sent to the department or local body responsible for fixing it.',
  },
  action_taken: {
    id: 'action_taken',
    labelEn: 'Action taken',
    labelHi: 'कार्रवाई पूरी',
    trackerStep: 4,
    description: 'The department reports the work as done, and the reporter can confirm it.',
  },
  routed: {
    id: 'routed',
    labelEn: 'Sent to an institution',
    labelHi: 'संस्थान को भेजा गया',
    trackerStep: 3,
    description: 'Matched and sent to one or more universities.',
  },
  in_progress: {
    id: 'in_progress',
    labelEn: 'Research in progress',
    labelHi: 'अनुसंधान प्रगति पर',
    trackerStep: 4,
    description: 'A university team is actively working on a solution.',
  },
  prototyped: {
    id: 'prototyped',
    labelEn: 'Prototype ready',
    labelHi: 'प्रोटोटाइप तैयार',
    trackerStep: 5,
    description: 'A working prototype has been built.',
  },
  piloted: {
    id: 'piloted',
    labelEn: 'Pilot underway',
    labelHi: 'पायलट जारी',
    trackerStep: 6,
    description: 'The solution is being tested in the field.',
  },
  deployed: {
    id: 'deployed',
    labelEn: 'Deployed',
    labelHi: 'तैनात',
    trackerStep: 7,
    description: 'The solution is live and serving the community.',
  },
  closed: {
    id: 'closed',
    labelEn: 'Closed',
    labelHi: 'बंद',
    trackerStep: 8,
    description: 'Work is complete and outcomes recorded.',
  },
  rejected: {
    id: 'rejected',
    labelEn: 'Not taken up',
    labelHi: 'स्वीकार नहीं',
    trackerStep: null,
    description: 'Did not meet validation criteria.',
  },
  duplicate: {
    id: 'duplicate',
    labelEn: 'Merged as a duplicate',
    labelHi: 'डुप्लिकेट के रूप में मर्ज',
    trackerStep: null,
    description: 'Already reported; merged into the original.',
  },
  on_hold: {
    id: 'on_hold',
    labelEn: 'On hold',
    labelHi: 'रोका गया',
    trackerStep: null,
    description: 'Paused pending resources or a dependency.',
  },
};

type TransitionTable = Record<ProblemStatus, Partial<Record<ProblemStatus, readonly Role[]>>>;

const GOV: readonly Role[] = ['gov_admin', 'super_admin'];
const UNIV: readonly Role[] = ['university_admin', 'faculty'];
const GOV_OR_UNIV: readonly Role[] = [...GOV, ...UNIV];
const DEPT: readonly Role[] = [...GOV, 'dept_officer'];

export const TRANSITIONS: TransitionTable = {
  submitted: {
    validated: GOV,
    assigned: GOV,
    rejected: GOV,
    duplicate: GOV,
    closed: GOV,
  },
  validated: {
    assigned: GOV,
    routed: GOV,
    on_hold: GOV,
    rejected: GOV,
    closed: GOV,
  },
  assigned: {
    action_taken: DEPT,
    routed: GOV,
    on_hold: GOV,
    rejected: GOV,
    closed: GOV,
  },
  action_taken: {
    closed: GOV,
    assigned: GOV,
  },
  routed: {
    in_progress: GOV_OR_UNIV,
    validated: GOV,
    on_hold: GOV,
  },
  in_progress: {
    prototyped: GOV_OR_UNIV,
    on_hold: GOV_OR_UNIV,
    closed: GOV,
  },
  prototyped: {
    piloted: GOV_OR_UNIV,
    on_hold: GOV_OR_UNIV,
    closed: GOV,
  },
  piloted: {
    deployed: GOV_OR_UNIV,
    in_progress: GOV_OR_UNIV,
    on_hold: GOV_OR_UNIV,
    closed: GOV,
  },
  deployed: {
    closed: GOV,
  },
  on_hold: {
    validated: GOV,
    assigned: GOV,
    routed: GOV,
    in_progress: GOV_OR_UNIV,
    prototyped: GOV_OR_UNIV,
    piloted: GOV_OR_UNIV,
    rejected: GOV,
  },
  closed: {
    assigned: GOV,
  },
  rejected: {
    submitted: GOV,
  },
  duplicate: {
    submitted: GOV,
  },
};

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
}

export function canTransition(from: ProblemStatus, to: ProblemStatus, role: Role): TransitionCheck {
  if (from === to) {
    return { allowed: false, reason: 'Status is already ' + from };
  }
  const roles = TRANSITIONS[from][to];
  if (!roles) {
    return { allowed: false, reason: `Cannot move from ${from} to ${to}` };
  }
  if (!roles.includes(role)) {
    return { allowed: false, reason: `Role ${role} may not move ${from} to ${to}` };
  }
  return { allowed: true };
}

export function transitionExists(from: ProblemStatus, to: ProblemStatus): boolean {
  return from !== to && Boolean(TRANSITIONS[from][to]);
}

export function allowedTransitions(from: ProblemStatus, role: Role): ProblemStatus[] {
  return (Object.keys(TRANSITIONS[from]) as ProblemStatus[]).filter((to) =>
    TRANSITIONS[from][to]?.includes(role),
  );
}

export function isTerminal(status: ProblemStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const ROUTING_RESPONSES = [
  'proposed',
  'accepted',
  'declined',
  'reassign_requested',
] as const;
export type RoutingResponse = (typeof ROUTING_RESPONSES)[number];

export const INTEREST_STATUSES = ['expressed', 'accepted', 'declined', 'withdrawn'] as const;
export type InterestStatus = (typeof INTEREST_STATUSES)[number];

export const MILESTONE_STATUSES = [
  'pending',
  'in_progress',
  'submitted',
  'approved',
  'rejected',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const PROJECT_PLANNING_STATUS = 'routed' satisfies ProblemStatus;

export const PROPOSAL_SUBMISSION_STATUSES = ['draft', 'submitted'] as const;

export const PROPOSAL_DECISIONS = ['approved', 'revision_requested', 'rejected'] as const;
export type ProposalDecision = (typeof PROPOSAL_DECISIONS)[number];

export const PROPOSAL_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'revision_requested',
  'rejected',
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const DEPARTMENT_TRACK: readonly ProblemStatus[] = [
  'submitted',
  'validated',
  'assigned',
  'action_taken',
  'closed',
];

export const RESEARCH_TRACK: readonly ProblemStatus[] = [
  'submitted',
  'validated',
  'routed',
  'in_progress',
  'prototyped',
  'piloted',
  'deployed',
  'closed',
];

export type ResolutionTrack = 'department' | 'research';

export function trackSteps(track: ResolutionTrack): readonly ProblemStatus[] {
  return track === 'department' ? DEPARTMENT_TRACK : RESEARCH_TRACK;
}
