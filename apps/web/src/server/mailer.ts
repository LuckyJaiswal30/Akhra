import { serverEnv } from './env';
import { logger } from './logger';

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendResult {
  delivered: boolean;
  providerMessageId: string | null;
}

export interface Mailer {
  readonly name: 'console' | 'resend';
  send(email: OutgoingEmail): Promise<SendResult>;
}

export type DeliveryFailure =
  'unverified_domain' | 'invalid_key' | 'rejected' | 'unreachable' | 'not_configured';

export class MailDeliveryError extends Error {
  constructor(
    message: string,
    readonly reason: DeliveryFailure,
  ) {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

class ConsoleMailer implements Mailer {
  readonly name = 'console' as const;

  send(email: OutgoingEmail): Promise<SendResult> {
    logger.info({ to: email.to, subject: email.subject }, 'email not sent (console driver)');
    logger.debug({ text: email.text }, 'email body');
    return Promise.resolve({ delivered: false, providerMessageId: null });
  }
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 8000;

export class ResendMailer implements Mailer {
  readonly name = 'resend' as const;

  constructor(
    private readonly options: { apiKey?: string; from: string; fetchImpl?: typeof fetch },
  ) {}

  async send(email: OutgoingEmail): Promise<SendResult> {
    if (!this.options.apiKey) {
      throw new MailDeliveryError(
        'MAIL_DRIVER=resend but RESEND_API_KEY is not set.',
        'not_configured',
      );
    }

    let response: Response;
    try {
      response = await (this.options.fetchImpl ?? globalThis.fetch)(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          'content-type': 'application/json',
        },
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
        body: JSON.stringify({
          from: this.options.from,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          ...(email.html ? { html: email.html } : {}),
        }),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new MailDeliveryError(`Resend could not be reached: ${detail}`, 'unreachable');
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (response.ok && payload.id) return { delivered: true, providerMessageId: payload.id };
    if (response.ok)
      throw new MailDeliveryError('Resend answered without a message id.', 'rejected');
    throw refusal(response.status, payload.message ?? '');
  }
}

function refusal(status: number, detail: string): MailDeliveryError {
  if (status === 401 || /api key is invalid/i.test(detail)) {
    return new MailDeliveryError(
      'Resend rejected RESEND_API_KEY (HTTP 401). Create a new key at resend.com/api-keys.',
      'invalid_key',
    );
  }
  if (status === 403 && /verify a domain|testing emails/i.test(detail)) {
    return new MailDeliveryError(
      'Resend only delivers to its own account address until you verify a sending domain at resend.com/domains and set MAIL_FROM to an address on it.',
      'unverified_domain',
    );
  }
  return new MailDeliveryError(
    `Resend refused the message (HTTP ${status}): ${detail.slice(0, 200)}`,
    'rejected',
  );
}

let cached: Mailer | undefined;

export function getMailer(): Mailer {
  cached ??=
    serverEnv.MAIL_DRIVER === 'resend'
      ? new ResendMailer({ apiKey: serverEnv.RESEND_API_KEY, from: serverEnv.MAIL_FROM })
      : new ConsoleMailer();
  return cached;
}
