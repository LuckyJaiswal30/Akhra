import React, { type ReactNode } from 'react';
import { Body, Container, Head, Html, Link, Preview, Section, Text } from 'react-email';

const palette = {
  paper: '#f4f7f5',
  card: '#ffffff',
  sal: '#1f6b45',
  salDeep: '#15502f',
  ink: '#17211c',
  subtle: '#56635c',
  faint: '#86918b',
  line: '#e2e8e4',
  track: '#e2e8e4',
};

export type EmailLanguage = 'en' | 'hi';

// Gmail loads no web fonts, so each phone uses its own: San Francisco, Roboto or Segoe UI.
const FONTS: Record<EmailLanguage, string> = {
  en: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  hi: "'Kohinoor Devanagari', 'Noto Sans Devanagari', 'Nirmala UI', Mangal, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
};
const MONO = "'SF Mono', Menlo, Consolas, 'Roboto Mono', 'Courier New', monospace";

const COPY: Record<EmailLanguage, { name: string; footer: string; reason: string }> = {
  en: {
    name: 'Akhra',
    footer: 'A Smart India Hackathon prototype for Jharkhand.',
    reason: 'This email was sent by Akhra. Replies to it are not read.',
  },
  hi: {
    name: 'अखरा',
    footer: 'झारखंड के लिए स्मार्ट इंडिया हैकथॉन का एक प्रोटोटाइप।',
    reason: 'यह ईमेल अखरा ने भेजा है। इसके जवाब पढ़े नहीं जाते।',
  },
};

export function EmailCard({
  lang,
  preview,
  reason,
  children,
}: {
  lang: EmailLanguage;
  preview: string;
  reason?: string;
  children: ReactNode;
}) {
  const font = FONTS[lang];
  return (
    <>
      <Preview>{preview}</Preview>
      <Container
        style={{
          backgroundColor: palette.card,
          border: `1px solid ${palette.line}`,
          borderRadius: '16px',
          margin: '0 auto',
          maxWidth: '520px',
          overflow: 'hidden',
        }}
      >
        <Section style={{ padding: '28px 32px 0' }}>
          <Text
            style={{
              color: palette.sal,
              fontFamily: font,
              fontSize: '19px',
              fontWeight: 700,
              lineHeight: '24px',
              margin: 0,
            }}
          >
            {COPY[lang].name}
          </Text>
        </Section>
        <Section style={{ fontFamily: font, padding: '18px 32px 6px' }}>{children}</Section>
        <Section style={{ borderTop: `1px solid ${palette.line}`, padding: '16px 32px 20px' }}>
          <Text
            style={{
              color: palette.faint,
              fontFamily: font,
              fontSize: '12px',
              lineHeight: '18px',
              margin: 0,
            }}
          >
            {COPY[lang].footer}
            <br />
            {reason ?? COPY[lang].reason}
          </Text>
        </Section>
      </Container>
    </>
  );
}

export function EmailPage({ lang = 'en', children }: { lang?: string; children: ReactNode }) {
  return (
    <Html lang={lang}>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Body style={{ backgroundColor: palette.paper, margin: 0, padding: '24px 12px' }}>
        {children}
      </Body>
    </Html>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: palette.ink,
        fontSize: '21px',
        fontWeight: 700,
        lineHeight: '29px',
        margin: '0 0 10px',
      }}
    >
      {children}
    </Text>
  );
}

export function Paragraph({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <Text
      style={{
        color: small ? palette.subtle : palette.ink,
        fontSize: small ? '13px' : '15px',
        lineHeight: small ? '20px' : '24px',
        margin: '0 0 16px',
        whiteSpace: 'pre-line',
      }}
    >
      {children}
    </Text>
  );
}

/** What just happened, in green, followed by what comes next. */
export function Lead({ lead, children }: { lead: string; children?: ReactNode }) {
  return (
    <Text
      style={{
        color: palette.ink,
        fontSize: '15px',
        lineHeight: '24px',
        margin: '0 0 16px',
        whiteSpace: 'pre-line',
      }}
    >
      <span style={{ color: palette.sal, fontWeight: 700 }}>{lead}</span>
      {children ? ' ' : null}
      {children}
    </Text>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <span style={{ color: palette.subtle, fontFamily: MONO, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

/** The reference code, then where and what, above the report's own title. */
export function ReportLine({ refCode, details }: { refCode: string; details: string[] }) {
  return (
    <Text
      style={{
        color: palette.subtle,
        fontSize: '12px',
        lineHeight: '18px',
        margin: '0 0 6px',
      }}
    >
      <span style={{ fontFamily: MONO, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
        {refCode}
      </span>
      {details.map((detail) => (
        <span key={detail}>{` · ${detail}`}</span>
      ))}
    </Text>
  );
}

/**
 * The report's steps as a bar. Five steps or fewer are named under the bar; a longer journey
 * would not fit a phone, so it gets one line saying which step it is on.
 */
export function Progress({
  steps,
  reached,
  caption,
}: {
  steps: string[];
  reached: number;
  caption: string;
}) {
  const named = steps.length <= 5;
  return (
    <Section style={{ margin: '4px 0 20px' }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: 'separate', tableLayout: 'fixed' }}
      >
        <tbody>
          <tr>
            {steps.map((step, index) => (
              <td
                key={step}
                style={{
                  paddingRight: index < steps.length - 1 ? '5px' : 0,
                  verticalAlign: 'top',
                }}
              >
                <div
                  style={{
                    backgroundColor: index <= reached ? palette.sal : palette.track,
                    borderRadius: '3px',
                    fontSize: '1px',
                    height: '6px',
                    lineHeight: '6px',
                  }}
                >
                  &nbsp;
                </div>
                {named && (
                  <div
                    style={{
                      color: index <= reached ? palette.ink : palette.faint,
                      fontSize: '11px',
                      fontWeight: index === reached ? 700 : 400,
                      lineHeight: '15px',
                      paddingRight: '4px',
                      paddingTop: '7px',
                    }}
                  >
                    {step}
                  </div>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {!named && (
        <Text
          style={{ color: palette.subtle, fontSize: '12px', lineHeight: '18px', margin: '8px 0 0' }}
        >
          {caption}
        </Text>
      )}
    </Section>
  );
}

export function CodeBox({ code }: { code: string }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ margin: '8px 0 20px' }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              borderBottom: `1px solid ${palette.line}`,
              borderTop: `1px solid ${palette.line}`,
              padding: '18px 12px',
            }}
          >
            <p
              style={{
                color: palette.salDeep,
                fontFamily: MONO,
                fontSize: '34px',
                fontWeight: 700,
                letterSpacing: '10px',
                lineHeight: '42px',
                margin: 0,
              }}
            >
              {code}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function ActionButton({
  href,
  label,
  fallback,
}: {
  href: string;
  label: string;
  fallback: ReactNode;
}) {
  return (
    <Section style={{ margin: '4px 0 16px' }}>
      <Link
        href={href}
        style={{
          backgroundColor: palette.sal,
          borderRadius: '9999px',
          color: '#ffffff',
          display: 'inline-block',
          fontSize: '15px',
          fontWeight: 600,
          padding: '12px 26px',
          textDecoration: 'none',
        }}
      >
        {label}
      </Link>
      <Text
        style={{ color: palette.faint, fontSize: '12px', lineHeight: '18px', margin: '14px 0 0' }}
      >
        {fallback}
      </Text>
    </Section>
  );
}

/** For links that cannot be typed by hand, such as an invitation: the whole address. */
export function LinkFallback({ label, href }: { label: string; href: string }) {
  return (
    <>
      {label}
      <br />
      <span style={{ color: palette.sal, wordBreak: 'break-all' }}>{href}</span>
    </>
  );
}
