type Labels = Record<string, string>;

const MESSAGE_BY_CODE: Record<string, string> = {
  form_identifier_not_found: 'errorCredentials',
  form_password_incorrect: 'errorCredentials',
  form_identifier_exists: 'errorEmailTaken',
  form_param_format_invalid: 'errorEmailInvalid',
  form_password_pwned: 'errorPasswordPwned',
  form_password_length_too_short: 'errorPasswordShort',
  form_password_size_in_bytes_exceeded: 'errorPasswordLong',
  form_password_not_strong_enough: 'errorPasswordNotStrong',
  form_password_validation_failed: 'errorPasswordWeak',
  form_code_incorrect: 'errorCodeIncorrect',
  verification_expired: 'errorCodeExpired',
  verification_failed: 'errorCodeExpired',
  too_many_requests: 'errorTooMany',
  user_locked: 'errorTooMany',
  oauth_access_denied: 'errorGoogleCancelled',
  external_account_not_found: 'errorGoogleUnavailable',
  oauth_config_missing: 'errorGoogleUnavailable',
  strategy_for_user_invalid: 'errorUseGoogle',
  captcha_invalid: 'errorCaptcha',
  captcha_missing_token: 'errorCaptcha',
  captcha_not_enabled: 'errorCaptcha',
  session_exists: 'errorSessionExists',
};

const FIELD_BY_CODE: Record<string, 'email' | 'password' | 'code'> = {
  form_identifier_exists: 'email',
  form_param_format_invalid: 'email',
  form_password_pwned: 'password',
  form_password_length_too_short: 'password',
  form_password_size_in_bytes_exceeded: 'password',
  form_password_not_strong_enough: 'password',
  form_password_validation_failed: 'password',
  form_code_incorrect: 'code',
};

export function clerkCode(error: unknown): string | undefined {
  const candidate = error as { code?: unknown; errors?: { code?: string }[] } | null;
  return (
    candidate?.errors?.[0]?.code ??
    (typeof candidate?.code === 'string' ? candidate.code : undefined)
  );
}

export function clerkMessage(error: unknown, labels: Labels): string {
  const code = clerkCode(error);
  const key = code ? MESSAGE_BY_CODE[code] : undefined;
  return (key && labels[key]) || labels.errorGeneric!;
}

export function clerkFieldError(
  error: unknown,
  labels: Labels,
): { field?: 'email' | 'password' | 'code'; message: string } {
  const code = clerkCode(error);
  return { field: code ? FIELD_BY_CODE[code] : undefined, message: clerkMessage(error, labels) };
}

export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : fallback;
}
