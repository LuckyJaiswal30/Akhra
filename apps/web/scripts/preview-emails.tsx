import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: ['../../.env.local', '../../.env'], quiet: true });
const { renderEmail } = await import('../src/server/email-template');
type EmailContent = Parameters<typeof renderEmail>[0];

const handpump = {
  refCode: 'AKH-2026-000134',
  title: 'Handpump water has turned yellow in our ward',
  district: 'Ranchi',
  category: 'Water & Sanitation',
};
const follow = { linkUrl: '/track?ref=AKH-2026-000134', linkLabel: 'Follow your report' };

const SAMPLES: Record<string, EmailContent> = {
  'report-received': {
    title: 'We got your report (AKH-2026-000134)',
    ...follow,
    report: {
      ...handpump,
      status: 'submitted',
      track: null,
      lead: 'Thank you. We got your report.',
      details:
        'Your district officer will check it next. Keep this code to follow it: AKH-2026-000134.',
    },
  },
  'status-department': {
    title: 'Your report has been sent to Ranchi Municipal Corporation (AKH-2026-000134)',
    ...follow,
    report: {
      ...handpump,
      status: 'assigned',
      track: 'department',
      lead: 'Your report has been sent to Ranchi Municipal Corporation.',
      details:
        'They have 21 days to fix it and write down what they did. We will email you when they do.',
    },
  },
  'status-work-done': {
    title: 'Ranchi Municipal Corporation says the work is done (AKH-2026-000134)',
    ...follow,
    report: {
      ...handpump,
      status: 'action_taken',
      track: 'department',
      lead: 'Ranchi Municipal Corporation says the work is done.',
      details:
        'Please check whether it is really fixed, then tell us on your report page. If it is not fixed, you can send it back to them.\n\nWhat they did: “The pipe near the handpump was cracked and let in drain water. We replaced 6 metres of pipe and flushed the handpump.”',
    },
  },
  'status-research': {
    title: 'Work has started on your report (AKH-2026-000134)',
    ...follow,
    report: {
      ...handpump,
      status: 'in_progress',
      track: 'research',
      lead: 'A university team has started working on your report.',
      details: 'We will email you each time they finish a step.',
    },
  },
  'status-hindi': {
    title: 'आपकी रिपोर्ट रांची नगर निगम को भेजी गई है (AKH-2026-000134)',
    linkUrl: '/track?ref=AKH-2026-000134',
    linkLabel: 'अपनी रिपोर्ट देखें',
    locale: 'hi',
    report: {
      refCode: 'AKH-2026-000134',
      title: 'हमारे वार्ड में हैंडपंप का पानी पीला हो गया है',
      district: 'राँची',
      category: 'जल एवं स्वच्छता',
      status: 'assigned',
      track: 'department',
      lead: 'आपकी रिपोर्ट रांची नगर निगम को भेजी गई है।',
      details:
        'उनके पास इसे ठीक करने और किया गया काम लिखने के लिए 21 दिन हैं। जब वे ऐसा करेंगे, हम आपको ईमेल करेंगे।',
    },
  },
  'status-rejected': {
    title: 'Your report could not be taken forward (AKH-2026-000134)',
    ...follow,
    report: {
      ...handpump,
      status: 'rejected',
      track: null,
      lead: 'Your district officer could not take this report forward.',
      details:
        'If the problem is still there, you can report it again with more detail or a photo.\n\nReason: “The handpump is on private land. Please ask the owner to contact the block office.”',
    },
  },
  invitation: {
    title: 'You are invited to join Akhra as University Administrator',
    body:
      'Anjali Verma has invited you to join Akhra as University Administrator for Birsa Agricultural University, Ranchi.\n\n' +
      'The link works once, only for this email address, until 15 September 2026 at 6:00 pm IST.',
    linkUrl: '/invite/example-token',
    linkLabel: 'Accept the invitation',
  },
  'department-new-report': {
    title: 'New report for your department (AKH-2026-000134)',
    body: '“Handpump water has turned yellow in our ward” needs your department to act. Please fix it and write down what you did within 21 days.',
    linkUrl: '/department',
    linkLabel: 'Open the report',
  },
  escalation: {
    title: 'Waiting 4 days for the next step (AKH-2026-000134)',
    body: '“Handpump water has turned yellow in our ward” in Ranchi has not moved for more than 3 days. It is now marked as late in the queue.',
    linkUrl: '/government/queue',
    linkLabel: 'Open the queue',
  },
};

const outputDir = join(process.cwd(), '.email-previews');
await mkdir(outputDir, { recursive: true });

for (const [name, content] of Object.entries(SAMPLES)) {
  const { html, text } = await renderEmail(content);
  await writeFile(join(outputDir, `${name}.html`), html, 'utf8');
  await writeFile(join(outputDir, `${name}.txt`), text, 'utf8');
}

process.stdout.write(`\n✓ ${Object.keys(SAMPLES).length} emails written to ${outputDir}\n`);
process.stdout.write(
  '  Open the .html files in a browser, and send one to a Gmail and an Outlook account to check there.\n\n',
);
