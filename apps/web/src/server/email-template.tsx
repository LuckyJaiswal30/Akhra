import React from 'react';
import { render } from '@react-email/render';
import { ActionButton, EmailCard, EmailPage, Heading, Paragraph } from './email-design';
import { appUrl } from './env';

export interface EmailContent {
  title: string;
  body?: string;
  linkUrl?: string;
  linkLabel?: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

const hostedLogo = appUrl.startsWith('https://') ? `${appUrl}/icons/icon-192.png` : undefined;

function AkhraEmail({ content }: { content: EmailContent }) {
  const href = content.linkUrl ? `${appUrl}${content.linkUrl}` : null;
  return (
    <EmailPage lang="en">
      <EmailCard lang="en" preview={content.title} logoUrl={hostedLogo}>
        <Heading>{content.title}</Heading>
        {content.body && <Paragraph>{content.body}</Paragraph>}
        {href && (
          <ActionButton
            href={href}
            label={content.linkLabel ?? 'Open in Akhra'}
            fallback="If the button does not work, copy this address into your browser:"
          />
        )}
      </EmailCard>
    </EmailPage>
  );
}

export function plainText(content: EmailContent): string {
  return [
    content.title,
    content.body,
    content.linkUrl ? `${content.linkLabel ?? 'Open in Akhra'}: ${appUrl}${content.linkUrl}` : null,
    '— Akhra, an initiative of the Government of Jharkhand',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function renderEmail(content: EmailContent): Promise<RenderedEmail> {
  const html = await render(<AkhraEmail content={content} />);
  return { html, text: plainText(content) };
}
