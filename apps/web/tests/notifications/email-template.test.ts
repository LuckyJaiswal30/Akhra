import { describe, expect, it } from 'vitest';
import { plainText, renderEmail } from '@/server/email-template';

const invitation = {
  title: 'You have been invited to Akhra as Faculty',
  body: 'Anjali Verma has invited you to join Akhra.',
  linkUrl: '/invite/abc',
  linkLabel: 'Accept the invitation',
};

describe('the emails Akhra sends', () => {
  it('carries Akhra’s name, colours and a logo that needs no image, so Gmail cannot block it', async () => {
    const { html } = await renderEmail(invitation);

    expect(html).toContain('Akhra');
    expect(html).toContain('Government of Jharkhand');
    expect(html.toLowerCase()).toContain('#1f6b45');
    expect(html).not.toMatch(/<img/i);
    expect(html).toMatch(/border-radius:14px 0 14px 0/);
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
    expect(text).toContain('Government of Jharkhand');
    expect(text).not.toContain('<');
  });

  it('leaves out the link entirely when a message has none', async () => {
    const content = { title: 'Your Akhra invitation expires soon', body: 'It expires tomorrow.' };

    const { html } = await renderEmail(content);

    expect(plainText(content)).not.toMatch(/open in akhra/i);
    expect(html).not.toContain('localhost:3000undefined');
  });
});
