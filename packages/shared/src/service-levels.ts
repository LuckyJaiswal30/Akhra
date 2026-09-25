export const TRIAGE_DAYS = 3;

export const FIX_DAYS = 21;

export const INTERIM_UPDATE_DAYS = 14;

export const REOPEN_WINDOW_DAYS = 30;

// The privacy page promises this: a reporter's contact details go one year after the report closes.
export const CONTACT_RETENTION_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (from: Date, days: number): Date => new Date(from.getTime() + days * DAY_MS);

export const fixDueAt = (assignedAt: Date): Date => addDays(assignedAt, FIX_DAYS);

export const interimUpdateDueAt = (assignedAt: Date): Date =>
  addDays(assignedAt, INTERIM_UPDATE_DAYS);

export const reopenClosesAt = (actionTakenAt: Date): Date =>
  addDays(actionTakenAt, REOPEN_WINDOW_DAYS);

export function daysLeft(due: Date, now = new Date()): number {
  return Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
}

export function isOverdue(due: Date | null, now = new Date()): boolean {
  return due !== null && due.getTime() < now.getTime();
}
