export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  INVALID_JSON: 400,
  INVITE_INVALID: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  INVITE_EMAIL_MISMATCH: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVITE_ALREADY_USED: 409,
  INVALID_TRANSITION: 409,
  INVITE_EXPIRED: 410,
  INVITE_REVOKED: 410,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_FILE_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export interface ErrorDetails {
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
  referenceId?: string;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
}

export interface ErrorEnvelope {
  error: ApiError;
}

export type ActionResult<T = undefined> =
  { ok: true; data: T; message?: string } | { ok: false; error: ApiError };

export type ActionState<T = undefined> = ActionResult<T> | null;

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = ERROR_STATUS[code];
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

interface IssueLike {
  code?: string;
  path: PropertyKey[];
  message: string;
  keys?: string[];
}

export function fieldErrorsFromIssues(issues: readonly IssueLike[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys ?? []) fields[key] ??= 'This field cannot be set here.';
      continue;
    }
    const key = issue.path.map(String).join('.') || 'form';
    fields[key] ??= issue.message;
  }
  return fields;
}

export function validationError(issues: readonly IssueLike[]): AppError {
  const fields = fieldErrorsFromIssues(issues);
  const entries = Object.values(fields);
  const message = entries.length === 1 ? entries[0]! : 'Some fields need your attention.';
  return new AppError('VALIDATION_FAILED', message, { fields });
}

export const Errors = {
  unauthenticated: (message = 'Please sign in to continue.') =>
    new AppError('UNAUTHENTICATED', message),
  forbidden: (message = 'You do not have permission to do this.') =>
    new AppError('FORBIDDEN', message),
  notFound: (message = 'That could not be found.') => new AppError('NOT_FOUND', message),
  conflict: (message: string) => new AppError('CONFLICT', message),
  invalidTransition: (message: string) => new AppError('INVALID_TRANSITION', message),
};
