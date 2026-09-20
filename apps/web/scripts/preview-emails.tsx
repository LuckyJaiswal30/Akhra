import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: ['../../.env.local', '../../.env'], quiet: true });
const { renderEmail } = await import('../src/server/email-template');
type EmailContent = Parameters<typeof renderEmail>[0];

const SAMPLES: Record<string, EmailContent> = {
  invitation: {
    title: 'You have been invited to Akhra as University Administrator',
    body:
      'Anjali Verma has invited you to join Akhra as University Administrator for Birsa Agricultural University, Ranchi.\n\n' +
      'This invitation is for this email address only, can be used once, and expires on 15 September 2026 at 6:00 pm IST.',
    linkUrl: '/invite/example-token',
    linkLabel: 'Accept the invitation',
  },
  'invitation-reminder': {
    title: 'Your Akhra invitation expires soon',
    body:
      'Your invitation to Akhra expires on 15 September 2026 at 6:00 pm IST.\n\n' +
      'Open the invitation link you were sent to accept it. If you no longer have it, ask whoever invited you for a new one.',
  },
  'report-received': {
    title: 'We received your report AKH-2026-000134',
    body:
      'Thank you. "Handpump water has turned yellow in our ward" has been received and will be reviewed by your district officer. ' +
      'Keep this reference code to follow its progress: AKH-2026-000134.',
    linkUrl: '/track?ref=AKH-2026-000134',
    linkLabel: 'Follow your report',
  },
  'status-change': {
    title: 'Update on your report AKH-2026-000134',
    body: '"Handpump water has turned yellow in our ward" is now: Sent to an institution.\n\nBirsa Agricultural University, Ranchi will take this on.',
    linkUrl: '/track?ref=AKH-2026-000134',
    linkLabel: 'Follow your report',
  },
  escalation: {
    title: 'Waiting 4 days in Ranchi: AKH-2026-000134',
    body: '"Handpump water has turned yellow in our ward" is still submitted after 72 hours. It now shows as escalated in the validation queue.',
    linkUrl: '/government/queue',
    linkLabel: 'Open the validation queue',
  },
  'milestone-due': {
    title: 'Milestone due soon: Field survey of 40 handpumps',
    body: 'Due 18 September 2026.',
    linkUrl: '/projects/example',
    linkLabel: 'Open the project',
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
