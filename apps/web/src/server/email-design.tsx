import React, { type ReactNode } from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

const palette = {
  paper: '#f4f7f5',
  card: '#ffffff',
  sal: '#1f6b45',
  salDeep: '#15502f',
  leafLight: '#5aa476',
  mint: '#eaf4ee',
  ink: '#17211c',
  subtle: '#56635c',
  line: '#e2e8e4',
  saffron: '#ff9933',
  indiaGreen: '#138808',
};

export type EmailLanguage = 'en' | 'hi';

const FONTS: Record<EmailLanguage, string> = {
  en: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  hi: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Helvetica Neue', Arial, sans-serif",
};

function LeafMark() {
  const leaf = (color: string, radius: string, marginTop: string) => (
    <span
      style={{
        backgroundColor: color,
        borderRadius: radius,
        display: 'inline-block',
        height: '22px',
        marginTop,
        verticalAlign: 'top',
        width: '13px',
      }}
    />
  );
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'separate' }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              backgroundColor: palette.mint,
              borderRadius: '10px',
              height: '40px',
              lineHeight: '0',
              textAlign: 'center',
              width: '40px',
            }}
          >
            {leaf(palette.sal, '14px 0 14px 0', '8px')}
            <span style={{ display: 'inline-block', width: '2px' }} />
            {leaf(palette.leafLight, '0 14px 0 14px', '11px')}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Logo({ url }: { url?: string }) {
  if (!url) return <LeafMark />;
  const image = (
    <Img
      src={url}
      width="40"
      height="40"
      alt=""
      style={{ borderRadius: '10px', display: 'block' }}
    />
  );
  const variable = /^\{\{([\w.]+)\}\}$/.exec(url)?.[1];
  if (!variable) return image;
  return (
    <>
      {`{{#if ${variable}}}`}
      {image}
      {'{{else}}'}
      <LeafMark />
      {'{{/if}}'}
    </>
  );
}

function Tricolour() {
  const band = (color: string) => (
    <td
      style={{
        backgroundColor: color,
        fontSize: '1px',
        height: '4px',
        lineHeight: '4px',
        width: '33.33%',
      }}
    >
      &nbsp;
    </td>
  );
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse' }}
    >
      <tbody>
        <tr>
          {band(palette.saffron)}
          {band('#ffffff')}
          {band(palette.indiaGreen)}
        </tr>
      </tbody>
    </table>
  );
}

const COPY: Record<EmailLanguage, { name: string; footer: string }> = {
  en: { name: 'Akhra', footer: 'Akhra · An initiative of the Government of Jharkhand' },
  hi: { name: 'अखरा', footer: 'अखरा · झारखंड सरकार की एक पहल' },
};

export function EmailCard({
  lang,
  preview,
  logoUrl,
  showLogo = true,
  children,
}: {
  lang: EmailLanguage;
  preview: string;
  showLogo?: boolean;
  logoUrl?: string;
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
          borderRadius: '14px',
          margin: '0 auto',
          maxWidth: '520px',
          overflow: 'hidden',
        }}
      >
        <Tricolour />
        <Section style={{ padding: '26px 32px 0' }}>
          <table role="presentation" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                {showLogo && (
                  <td style={{ paddingRight: '10px', verticalAlign: 'middle' }}>
                    <Logo url={logoUrl} />
                  </td>
                )}
                <td
                  style={{
                    color: palette.ink,
                    fontFamily: font,
                    fontSize: '20px',
                    fontWeight: 700,
                    verticalAlign: 'middle',
                  }}
                >
                  {COPY[lang].name}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Section style={{ fontFamily: font, padding: '22px 32px 6px' }}>{children}</Section>
        <Section style={{ borderTop: `1px solid ${palette.line}`, padding: '14px 32px 18px' }}>
          <Text
            style={{
              color: palette.subtle,
              fontFamily: font,
              fontSize: '12px',
              lineHeight: '18px',
              margin: 0,
            }}
          >
            {COPY[lang].footer}
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
        fontSize: '20px',
        fontWeight: 700,
        lineHeight: '28px',
        margin: '0 0 8px',
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

export function CodeBox({ code }: { code: string }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ margin: '4px 0 16px' }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{ backgroundColor: palette.mint, borderRadius: '10px', padding: '16px 12px' }}
          >
            <p
              style={{
                color: palette.salDeep,
                fontFamily: "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace",
                fontSize: '34px',
                fontWeight: 700,
                letterSpacing: '8px',
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
  fallback: string;
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
          padding: '12px 28px',
          textDecoration: 'none',
        }}
      >
        {label}
      </Link>
      <Text
        style={{ color: palette.subtle, fontSize: '12px', lineHeight: '18px', margin: '14px 0 0' }}
      >
        {fallback}
        <br />
        <span style={{ color: palette.sal, wordBreak: 'break-all' }}>{href}</span>
      </Text>
    </Section>
  );
}
