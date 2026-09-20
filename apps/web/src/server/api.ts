import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import type { ZodType } from 'zod';
import { AppError, validationError, type ActionResult, type ErrorEnvelope } from '@akhra/shared';
import { logger } from './logger';

type RouteContext<P> = { params: Promise<P> };
type RouteHandler<P> = (request: Request, context: RouteContext<P>) => Promise<Response>;

function toAppError(error: unknown, context: Record<string, unknown> = {}): AppError {
  if (error instanceof AppError) return error;

  const issues = (error as { issues?: unknown })?.issues;
  if ((error as { name?: string })?.name === 'ZodError' && Array.isArray(issues)) {
    return validationError(issues);
  }

  const referenceId = randomUUID().slice(0, 8);
  logger.error({ err: error, referenceId, ...context }, 'unhandled error');
  return new AppError(
    'INTERNAL_ERROR',
    `Something went wrong on our side. Please try again; if it keeps happening, quote reference ${referenceId}.`,
    { referenceId },
  );
}

function errorResponse(
  error: unknown,
  context: Record<string, unknown> = {},
): NextResponse<ErrorEnvelope> {
  const appError = toAppError(error, context);
  const headers: Record<string, string> = {};
  if (appError.details?.retryAfterSeconds)
    headers['retry-after'] = String(appError.details.retryAfterSeconds);
  return NextResponse.json({ error: appError.toJSON() }, { status: appError.status, headers });
}

export function apiRoute<P = Record<string, string>>(handler: RouteHandler<P>): RouteHandler<P> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error, { method: request.method, path: new URL(request.url).pathname });
    }
  };
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError('INVALID_JSON', 'The request body is not valid JSON.');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw validationError(parsed.error.issues);
  return parsed.data;
}

export function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw validationError(parsed.error.issues);
  return parsed.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formId(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? '');
  if (!UUID.test(value)) {
    throw new AppError(
      'VALIDATION_FAILED',
      'This form is missing something it needs. Reload the page and try again.',
      {
        fields: { [key]: 'Missing or invalid reference.' },
      },
    );
  }
  return value;
}

export function ok<T>(data: T, status = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T): NextResponse<{ data: T }> {
  return ok(data, 201);
}

export async function runAction<T = undefined>(
  context: string,
  fn: () => Promise<{ data?: T; message?: string } | void>,
): Promise<ActionResult<T>> {
  try {
    const outcome = (await fn()) ?? {};
    return { ok: true, data: outcome.data as T, message: outcome.message };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toAppError(error, { action: context }).toJSON() };
  }
}
