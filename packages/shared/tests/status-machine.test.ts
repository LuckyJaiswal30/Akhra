import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  PROBLEM_STATUSES,
  ROLES,
  TERMINAL_STATUSES,
  TRANSITIONS,
  type ProblemStatus,
  type Role,
} from '../src/index';

describe('status machine', () => {
  it('defines an entry for every status', () => {
    for (const status of PROBLEM_STATUSES) {
      expect(TRANSITIONS[status]).toBeDefined();
    }
  });

  it('only references real statuses and roles', () => {
    for (const [from, targets] of Object.entries(TRANSITIONS)) {
      expect(PROBLEM_STATUSES).toContain(from);
      for (const [to, roles] of Object.entries(targets)) {
        expect(PROBLEM_STATUSES).toContain(to);
        for (const role of roles ?? []) expect(ROLES).toContain(role);
      }
    }
  });

  it('lets only government reopen a closed report, and only back to the department', () => {
    expect(allowedTransitions('closed', 'gov_admin')).toEqual(['assigned']);
    expect(allowedTransitions('closed', 'super_admin')).toEqual(['assigned']);
    for (const role of ROLES.filter((r) => r !== 'gov_admin' && r !== 'super_admin')) {
      expect(allowedTransitions('closed', role)).toEqual([]);
    }
  });

  it('refuses a no-op transition', () => {
    expect(canTransition('submitted', 'submitted', 'gov_admin').allowed).toBe(false);
  });

  it('refuses skipping validation straight to research', () => {
    expect(canTransition('submitted', 'in_progress', 'gov_admin').allowed).toBe(false);
  });

  it('can reach closed from submitted along the happy path', () => {
    const path: ProblemStatus[] = [
      'submitted',
      'validated',
      'routed',
      'in_progress',
      'prototyped',
      'piloted',
      'deployed',
      'closed',
    ];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransition(path[i]!, path[i + 1]!, 'gov_admin').allowed).toBe(true);
    }
  });

  it('keeps terminal statuses terminal except for an administrator reopening', () => {
    const reopensTo: Record<string, string> = {
      closed: 'assigned',
      rejected: 'submitted',
      duplicate: 'submitted',
    };
    for (const status of TERMINAL_STATUSES) {
      const reachable = new Set(ROLES.flatMap((role) => allowedTransitions(status, role)));
      for (const to of reachable) expect(to).toBe(reopensTo[status]);
    }
  });
});

describe('RBAC over the status machine', () => {
  const nonGovRoles: Role[] = ['citizen', 'university_admin', 'faculty', 'industry_partner'];

  it('lets only government validate, reject or route a report', () => {
    for (const role of nonGovRoles) {
      expect(canTransition('submitted', 'validated', role).allowed).toBe(false);
      expect(canTransition('submitted', 'rejected', role).allowed).toBe(false);
      expect(canTransition('validated', 'routed', role).allowed).toBe(false);
    }
    expect(canTransition('submitted', 'validated', 'gov_admin').allowed).toBe(true);
    expect(canTransition('validated', 'routed', 'super_admin').allowed).toBe(true);
  });

  it('lets a university team advance its own research stages', () => {
    for (const role of ['university_admin', 'faculty'] as Role[]) {
      expect(canTransition('in_progress', 'prototyped', role).allowed).toBe(true);
      expect(canTransition('prototyped', 'piloted', role).allowed).toBe(true);
      expect(canTransition('piloted', 'deployed', role).allowed).toBe(true);
    }
  });

  it('reserves closing a project for government', () => {
    expect(canTransition('deployed', 'closed', 'university_admin').allowed).toBe(false);
    expect(canTransition('deployed', 'closed', 'gov_admin').allowed).toBe(true);
  });

  it('gives citizens and industry partners no transitions at all', () => {
    for (const role of ['citizen', 'industry_partner'] as Role[]) {
      for (const status of PROBLEM_STATUSES) {
        expect(allowedTransitions(status, role)).toEqual([]);
      }
    }
  });
});
