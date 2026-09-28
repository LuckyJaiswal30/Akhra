import { describe, expect, it } from 'vitest';
import { canDrawReport, siteImage } from '@/server/og';

describe('the image shown when a report is shared', () => {
  it('draws a report whose title is in English or Hinglish', () => {
    expect(canDrawReport({ title: 'Mohalle ka chapakal teen hafte se kharab hai' })).toBe(true);
  });

  it('uses the site image for a title in Hindi letters, which the renderer would garble', () => {
    expect(canDrawReport({ title: 'मोहल्ले का चापाकल तीन हफ़्ते से खराब है' })).toBe(false);
    expect(canDrawReport({ title: 'Chapakal kharab hai, पानी नहीं आता' })).toBe(false);
  });

  it('picks the site image in the page language', () => {
    expect(siteImage('hi')).toBe('/og/site-hi.png');
    expect(siteImage('en')).toBe('/og/site-en.png');
    expect(siteImage('anything else')).toBe('/og/site-en.png');
  });
});
