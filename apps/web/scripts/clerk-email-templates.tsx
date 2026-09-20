import React from 'react';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { render } from '@react-email/render';
import { config } from 'dotenv';

config({ path: ['../../.env.local', '../../.env'], quiet: true });
const { ActionButton, CodeBox, EmailCard, EmailPage, Heading, Paragraph } =
  await import('../src/server/email-design');

const v = (name: string) => `{{${name}}}`;
const ifThen = (name: string, then: string, otherwise = '') =>
  `{{#if ${name}}}${then}${otherwise ? `{{else}}${otherwise}` : ''}{{/if}}`;

const T = {
  codeExpires: 'It expires in a few minutes. Never share it — Akhra will never ask you for it.',
  buttonFallback: 'If the button does not work, copy this address into your browser:',
};

interface ClerkTemplate {
  slug: string;
  name: string;
  subject: string;
  required: string[];
  element: React.ReactElement;
  sample: Record<string, string>;
}

const TEMPLATES: ClerkTemplate[] = [
  {
    slug: 'verification_code',
    name: 'Verification code',
    subject: `${v('otp_code')} is your Akhra verification code`,
    required: ['otp_code'],
    sample: { otp_code: '482913' },
    element: (
      <EmailPage>
        <EmailCard
          lang="en"
          showLogo={false}
          preview={`${v('otp_code')} is your Akhra verification code`}
        >
          <Heading>Your verification code</Heading>
          <Paragraph>Enter this code on Akhra to continue.</Paragraph>
          <CodeBox code={v('otp_code')} />
          <Paragraph small>{T.codeExpires}</Paragraph>
          <Paragraph small>
            Didn’t request this? You can ignore this email. If you think someone else is using your
            account, reset your password on Akhra — that signs you out of all devices.
          </Paragraph>
        </EmailCard>
      </EmailPage>
    ),
  },
  {
    slug: 'reset_password_code',
    name: 'Reset password code',
    subject: `${v('otp_code')} is your Akhra password reset code`,
    required: ['otp_code'],
    sample: { otp_code: '730514' },
    element: (
      <EmailPage>
        <EmailCard
          lang="en"
          showLogo={false}
          preview={`${v('otp_code')} is your Akhra password reset code`}
        >
          <Heading>Reset your password</Heading>
          <Paragraph>Enter this code on Akhra to choose a new password.</Paragraph>
          <CodeBox code={v('otp_code')} />
          <Paragraph small>{T.codeExpires}</Paragraph>
          <Paragraph small>
            Didn’t ask for this? Ignore this email — your password stays the same. If you think
            someone else is using your account, sign in and choose Your account → Sign out of all
            devices.
          </Paragraph>
        </EmailCard>
      </EmailPage>
    ),
  },
  {
    slug: 'invitation',
    name: 'Invitation',
    subject: 'You’re invited to join Akhra',
    required: ['action_url'],
    sample: {
      action_url: 'https://akhra.example/invite/sample',
      inviter_name: 'Anjali Verma',
      'invitation.expires_in_days': '3',
    },
    element: (
      <EmailPage>
        <EmailCard lang="en" showLogo={false} preview="You’re invited to join Akhra">
          <Heading>You’re invited to Akhra</Heading>
          <Paragraph>
            {ifThen(
              'inviter_name',
              `${v('inviter_name')} has invited you`,
              'You have been invited',
            )}{' '}
            to join Akhra, where citizens, universities, industry and government solve Jharkhand’s
            problems together.
          </Paragraph>
          <ActionButton
            href={v('action_url')}
            label="Accept invitation"
            fallback={T.buttonFallback}
          />
          <Paragraph small>
            This invitation is for this email address only
            {ifThen(
              'invitation.expires_in_days',
              ` and expires in ${v('invitation.expires_in_days')} days`,
            )}
            .
          </Paragraph>
        </EmailCard>
      </EmailPage>
    ),
  },
  {
    slug: 'password_changed',
    name: 'Password changed',
    subject: 'Your Akhra password was changed',
    required: [],
    sample: { primary_email_address: 'you@example.com' },
    element: (
      <EmailPage>
        <EmailCard lang="en" showLogo={false} preview="Your Akhra password was changed">
          <Heading>Your password was changed</Heading>
          <Paragraph>
            The password for {v('primary_email_address')} was just changed. If this wasn’t you,
            reset it now with “Forgot password?” on the sign-in page — that signs you out of all
            devices.
          </Paragraph>
        </EmailCard>
      </EmailPage>
    ),
  },
  {
    slug: 'new_device_sign_in',
    name: 'Sign in from new device',
    subject: 'New sign-in to your Akhra account',
    required: [],
    sample: {
      browser_name: 'Chrome',
      operating_system: 'Android',
      location: 'Ranchi, IN',
      session_created_at: '16 September 2026, 10:42',
      revoke_session_url: 'https://akhra.example/revoke',
    },
    element: (
      <EmailPage>
        <EmailCard lang="en" showLogo={false} preview="New sign-in to your Akhra account">
          <Heading>New sign-in to your account</Heading>
          <Paragraph>
            {v('browser_name')} on {v('operating_system')}, {v('location')}, at{' '}
            {v('session_created_at')}.
          </Paragraph>
          <Paragraph small>
            If this wasn’t you, reset your password on Akhra — that signs you out of all devices.
          </Paragraph>
          {'{{#if revoke_session_url}}'}
          <ActionButton
            href={v('revoke_session_url')}
            label="This wasn’t me"
            fallback={T.buttonFallback}
          />
          {'{{/if}}'}
        </EmailCard>
      </EmailPage>
    ),
  },
];

function fillSample(html: string, values: Record<string, string>): string {
  let out = html;
  out = out.replace(
    /\{\{#equal ([\w.]+) "([\w-]+)"\}\}([\s\S]*?)\{\{\/equal\}\}/g,
    (_, name: string, want: string, inner: string) => (values[name] === want ? inner : ''),
  );
  out = out.replace(
    /\{\{#unless ([\w.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, name: string, inner: string) => (values[name] ? '' : inner),
  );
  out = out.replace(
    /\{\{#if ([\w.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_, name: string, then: string, otherwise = '') => (values[name] ? then : otherwise),
  );
  return out.replace(/\{\{([\w.]+)\}\}/g, (_, name: string) => values[name] ?? '');
}

function check(template: ClerkTemplate, html: string) {
  for (const name of template.required) {
    if (!html.includes(v(name)))
      throw new Error(`${template.slug}: the required variable ${v(name)} is missing`);
  }
  for (const tag of ['if', 'equal', 'unless']) {
    const opened = (html.match(new RegExp(`\\{\\{#${tag} `, 'g')) ?? []).length;
    const closed = (html.match(new RegExp(`\\{\\{/${tag}\\}\\}`, 'g')) ?? []).length;
    if (opened !== closed)
      throw new Error(`${template.slug}: ${opened} {{#${tag}}} blocks but ${closed} {{/${tag}}}`);
  }
  if (/\{\{[^}]*&[a-z#0-9]+;[^}]*\}\}/i.test(html))
    throw new Error(`${template.slug}: a Handlebars expression was HTML-escaped`);
}

async function clerk(path: string, init: RequestInit & { body?: string }) {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error('CLERK_SECRET_KEY is not set in .env.local');
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    errors?: { long_message?: string; message?: string }[];
  };
  if (!response.ok)
    throw new Error(
      `${init.method} ${path} → ${response.status}: ${payload.errors?.[0]?.long_message ?? payload.errors?.[0]?.message ?? 'refused'}`,
    );
  return payload;
}

const push = process.argv.includes('--push');
if (push && !process.argv.includes('--accept-lock-risk')) {
  process.stderr.write(
    '\nRefusing to upload: Clerk locks email template editing after one more "suspicious" refusal on this instance.\n' +
      'Ask Clerk support to review or reset it first, then rerun with --push --only <template> --accept-lock-risk.\n\n',
  );
  process.exit(1);
}
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex > -1 ? process.argv[onlyIndex + 1] : undefined;
const outputDir = join(process.cwd(), '.email-previews');
await mkdir(outputDir, { recursive: true });

for (const template of TEMPLATES) {
  const html = (await render(template.element)).replace(/\{\{[^}]*\}\}/g, (expression) =>
    expression.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&'),
  );
  check(template, html);

  await writeFile(
    join(outputDir, `clerk-${template.slug}.html`),
    fillSample(html, template.sample),
    'utf8',
  );

  if (push && (!only || only === template.slug)) {
    await clerk(`/templates/email/${template.slug}/preview`, {
      method: 'POST',
      body: JSON.stringify({ subject: template.subject, body: html }),
    });
    await clerk(`/templates/email/${template.slug}`, {
      method: 'PUT',
      body: JSON.stringify({ name: template.name, subject: template.subject, body: html }),
    });
    process.stdout.write(`  ↑ ${template.slug} uploaded to Clerk\n`);
  }
}

process.stdout.write(
  `\n✓ ${TEMPLATES.length} Clerk email templates rendered to ${outputDir}/clerk-*.html\n`,
);
if (!push)
  process.stdout.write(
    '  Run with --push to upload them to the Clerk instance in CLERK_SECRET_KEY.\n\n',
  );
