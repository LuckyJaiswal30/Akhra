import { describe, expect, it } from 'vitest';
import { plainText, renderEmail } from '@/server/email-template';

const invitation = {
  title: 'You have been invited to Akhra as Faculty',
  body: 'Anjali Verma has invited you to join Akhra.',
  linkUrl: '/invite/abc',
  linkLabel: 'Accept the invitation',
};

describe('the emails Akhra sends', () => {
  it('carries Akhra’s name and colours in the phone’s own font, with no image for Gmail to block', async () => {
    const { html } = await renderEmail(invitation);

    expect(html).toContain('Akhra');
    expect(html).toContain('Smart India Hackathon prototype for Jharkhand');
    expect(html.toLowerCase()).toContain('#1f6b45');
    expect(html).not.toMatch(/<img/i);
    expect(html).toMatch(/-apple-system/);
  });

  it('shows a report with its code, where it is, and how far it has come', async () => {
    const { html } = await renderEmail({
      title: 'Your report has been sent to Ranchi Municipal Corporation (AKH-2026-000134)',
      linkUrl: '/track?ref=AKH-2026-000134',
      linkLabel: 'Follow your report',
      report: {
        refCode: 'AKH-2026-000134',
        title: 'Handpump water has turned yellow in our ward',
        district: 'Ranchi',
        category: 'Water & Sanitation',
        status: 'assigned',
        track: 'department',
        lead: 'Your report has been sent to Ranchi Municipal Corporation.',
        details: 'They have 21 days to fix it.',
      },
    });

    expect(html).toContain('Handpump water has turned yellow in our ward');
    expect(html).toContain('Ranchi');
    expect(html).toContain('Being fixed');
    expect(html).toMatch(/enter .*AKH-2026-000134/);
  });

  it('styles elements inline, because email clients drop stylesheets', async () => {
    const { html } = await renderEmail(invitation);

    expect(html).toMatch(/style="[^"]+"/i);
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
  });

  it('turns the in-app path into a full address the reader can click, and repeats it as text', async () => {
    const { html } = await renderEmail(invitation);

    expect(html).toContain('http://localhost:3000/invite/abc');
    expect(html).toContain('Accept the invitation');
    expect(html).toMatch(/copy this address/i);
  });

  it('always comes with a plain-text version', async () => {
    const { text } = await renderEmail(invitation);

    expect(text).toContain('You have been invited to Akhra as Faculty');
    expect(text).toContain('http://localhost:3000/invite/abc');
    expect(text).toContain('Smart India Hackathon prototype for Jharkhand');
    expect(text).not.toContain('<');
  });

  it('leaves out the link entirely when a message has none', async () => {
    const content = { title: 'Your Akhra invitation expires soon', body: 'It expires tomorrow.' };

    const { html } = await renderEmail(content);

    expect(plainText(content)).not.toMatch(/open in akhra/i);
    expect(html).not.toContain('localhost:3000undefined');
  });
});
