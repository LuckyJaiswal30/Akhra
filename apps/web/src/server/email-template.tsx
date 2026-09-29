import React from 'react';
import { render } from '@react-email/render';
import { type ProblemStatus, type ResolutionTrack } from '@akhra/shared';
import {
  ActionButton,
  Code,
  EmailCard,
  EmailPage,
  Heading,
  Lead,
  LinkFallback,
  Paragraph,
  Progress,
  ReportLine,
} from './email-design';
import { appUrl } from './env';

/** A report the email is about: shown with its code, place, title and how far it has come. */
export interface ReportEmail {
  refCode: string;
  title: string;
  district?: string;
  category?: string;
  status: ProblemStatus;
  track: ResolutionTrack | null;
  /** What just happened, shown in green. */
  lead: string;
  /** What it means, or what happens next. */
  details?: string;
}

export interface EmailContent {
  title: string;
  body?: string;
  linkUrl?: string;
  linkLabel?: string;
  locale?: string;
  report?: ReportEmail;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

const STEPS: Record<
  ResolutionTrack | 'unknown',
  { en: string[]; hi: string[]; of: ProblemStatus[] }
> = {
  department: {
    en: ['Reported', 'Checked', 'Being fixed', 'Work done', 'Closed'],
    hi: ['दर्ज', 'जाँची गई', 'काम जारी', 'काम पूरा', 'बंद'],
    of: ['submitted', 'validated', 'assigned', 'action_taken', 'closed'],
  },
  research: {
    en: [
      'Reported',
      'Checked',
      'Sent',
      'Research',
      'First version',
      'Field test',
      'In use',
      'Closed',
    ],
    hi: ['दर्ज', 'जाँची गई', 'भेजी गई', 'शोध', 'पहला रूप', 'फ़ील्ड जाँच', 'उपयोग में', 'बंद'],
    of: [
      'submitted',
      'validated',
      'routed',
      'in_progress',
      'prototyped',
      'piloted',
      'deployed',
      'closed',
    ],
  },
  // Before an officer picks a route, the report could go either way.
  unknown: {
    en: ['Reported', 'Checked', 'Being worked on', 'Closed'],
    hi: ['दर्ज', 'जाँची गई', 'काम जारी', 'बंद'],
    of: ['submitted', 'validated', 'assigned', 'closed'],
  },
};

export function reportSteps(report: Pick<ReportEmail, 'status' | 'track'>, hindi: boolean) {
  const steps = STEPS[report.track ?? 'unknown'];
  const reached = steps.of.indexOf(report.status);
  if (reached < 0) return null;
  const labels = hindi ? steps.hi : steps.en;
  const caption = hindi
    ? `${labels.length} में से चरण ${reached + 1}: ${labels[reached]}`
    : `Step ${reached + 1} of ${labels.length}: ${labels[reached]}`;
  return { labels, reached, caption };
}

function ReportBody({ report, hindi }: { report: ReportEmail; hindi: boolean }) {
  const steps = reportSteps(report, hindi);
  return (
    <>
      <ReportLine
        refCode={report.refCode}
        details={[report.district, report.category].filter((part): part is string => !!part)}
      />
      <Heading>{report.title}</Heading>
      <Lead lead={report.lead}>{report.details}</Lead>
      {steps && <Progress steps={steps.labels} reached={steps.reached} caption={steps.caption} />}
    </>
  );
}

function AkhraEmail({ content }: { content: EmailContent }) {
  const href = content.linkUrl ? `${appUrl}${content.linkUrl}` : null;
  const hindi = content.locale === 'hi';
  const lang = hindi ? 'hi' : 'en';
  const report = content.report;
  const trackPage = `${appUrl.replace(/^https?:\/\//, '')}/track`;
  return (
    <EmailPage lang={lang}>
      <EmailCard lang={lang} preview={report ? report.lead : content.title}>
        {report ? (
          <ReportBody report={report} hindi={hindi} />
        ) : (
          <>
            <Heading>{content.title}</Heading>
            {content.body && <Paragraph>{content.body}</Paragraph>}
          </>
        )}
        {href && (
          <ActionButton
            href={href}
            label={content.linkLabel ?? (hindi ? 'अखरा में खोलें' : 'Open in Akhra')}
            fallback={
              report ? (
                hindi ? (
                  <>
                    बटन न चले तो {trackPage} खोलें और <Code>{report.refCode}</Code> डालें।
                  </>
                ) : (
                  <>
                    Button not working? Open {trackPage} and enter <Code>{report.refCode}</Code>.
                  </>
                )
              ) : (
                <LinkFallback
                  label={
                    hindi
                      ? 'बटन न चले तो यह पता अपने ब्राउज़र में खोलें:'
                      : 'Button not working? Copy this address into your browser:'
                  }
                  href={href}
                />
              )
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
