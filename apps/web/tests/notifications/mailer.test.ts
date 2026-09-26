import { describe, expect, it, vi } from 'vitest';
import { canReceiveMail, MailDeliveryError, ResendMailer } from '@/server/mailer';

describe('Resend responses', () => {
  const stubFetch = (status: number, payload: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(payload), { status }));

  it('recognises the free-tier restriction and says what has to change', async () => {
    const fetchImpl = stubFetch(403, {
      statusCode: 403,
      name: 'validation_error',
      message:
        'You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.',
    });
    const mailer = new ResendMailer({
      apiKey: 're_test',
      from: 'Akhra <onboarding@resend.dev>',
      fetchImpl,
    });

    const refusal = await mailer
      .send({ to: 'citizen@gmail.com', subject: 's', text: 't' })
      .catch((e: unknown) => e);
    expect(refusal).toBeInstanceOf(MailDeliveryError);
    expect(refusal).toMatchObject({ reason: 'unverified_domain' });
    expect((refusal as Error).message).toMatch(/verify a sending domain/i);
  });

  it('treats a rejected key as a configuration problem, not a delivery', async () => {
    const mailer = new ResendMailer({
      apiKey: 're_bad',
      from: 'Akhra <onboarding@resend.dev>',
      fetchImpl: stubFetch(401, { statusCode: 401, message: 'API key is invalid' }),
    });

    await expect(mailer.send({ to: 'a@gmail.com', subject: 's', text: 't' })).rejects.toMatchObject(
      {
        reason: 'invalid_key',
      },
    );
  });

  it('counts a message as delivered only when Resend returns its id', async () => {
    const mailer = new ResendMailer({
      apiKey: 're_test',
      from: 'Akhra <onboarding@resend.dev>',
      fetchImpl: stubFetch(200, { id: 'b5e1c0de-0000-4000-8000-000000000001' }),
    });

    await expect(mailer.send({ to: 'a@gmail.com', subject: 's', text: 't' })).resolves.toEqual({
      delivered: true,
      providerMessageId: 'b5e1c0de-0000-4000-8000-000000000001',
    });
  });

  it('never sends to a reserved test address, so demo accounts cannot cause bounces', async () => {
    const fetchImpl = stubFetch(200, { id: 'msg_1' });
    const mailer = new ResendMailer({ apiKey: 're_test', from: 'Akhra <a@b.in>', fetchImpl });

    const result = await mailer.send({
      to: 'district.ranchi+clerk_test@example.com',
      subject: 's',
      text: 't',
    });

    expect(result.delivered).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(canReceiveMail('reporter@gmail.com')).toBe(true);
    expect(canReceiveMail('someone@school.test')).toBe(false);
  });
});
