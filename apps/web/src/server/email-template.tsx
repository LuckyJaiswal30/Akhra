import React from 'react';
import { render } from '@react-email/render';
import { ActionButton, EmailCard, EmailPage, Heading, Paragraph } from './email-design';
import { appUrl } from './env';

export interface EmailContent {
  title: string;
  body?: string;
  linkUrl?: string;
  linkLabel?: string;
  locale?: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

const hostedLogo = appUrl.startsWith('https://') ? `${appUrl}/icons/icon-192.png` : undefined;

function AkhraEmail({ content }: { content: EmailContent }) {
  const href = content.linkUrl ? `${appUrl}${content.linkUrl}` : null;
  const hindi = content.locale === 'hi';
  const lang = hindi ? 'hi' : 'en';
  return (
    <EmailPage lang={lang}>
      <EmailCard lang={lang} preview={content.title} logoUrl={hostedLogo}>
        <Heading>{content.title}</Heading>
        {content.body && <Paragraph>{content.body}</Paragraph>}
        {href && (
          <ActionButton
            href={href}
            label={content.linkLabel ?? (hindi ? 'अखरा में खोलें' : 'Open in Akhra')}
            fallback={
              hindi
                ? 'बटन काम न करे तो यह पता अपने ब्राउज़र में खोलें:'
                : 'If the button does not work, copy this address into your browser:'
            }
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
    content.linkUrl
      ? `${content.linkLabel ?? (content.locale === 'hi' ? 'अखरा में खोलें' : 'Open in Akhra')}: ${appUrl}${content.linkUrl}`
      : null,
    content.locale === 'hi'
      ? '— अखरा, झारखंड के लिए स्मार्ट इंडिया हैकथॉन का एक प्रोटोटाइप'
      : '— Akhra, a Smart India Hackathon prototype for Jharkhand',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function renderEmail(content: EmailContent): Promise<RenderedEmail> {
  const html = await render(<AkhraEmail content={content} />);
  return { html, text: plainText(content) };
}
