import type { ApiError } from '@akhra/shared';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const UNREACHABLE: ApiError = {
  code: 'INTERNAL_ERROR',
  message: 'We could not reach Akhra. Check your connection and try again.',
};

export async function requestJson<T>(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: T;
      error?: ApiError;
    } | null;
    if (response.ok) return { ok: true, data: payload?.data as T };
    return {
      ok: false,
      error: payload?.error ?? {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    };
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}
