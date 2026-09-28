import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

// The site's share image is drawn by a real browser, because the server-side image renderer cannot
// place Hindi vowel signs correctly. Run this again whenever the wording below changes.

const COPY = {
  en: {
    lang: 'en',
    reach: 'For all 24 districts of Jharkhand',
    lead: 'Report it once.',
    follow: 'Follow it until it is fixed.',
    other: 'एक बार बताइए। ठीक होने तक साथ रहिए।',
    steps: [
      'Citizen reports',
      'Officer checks',
      'Department or university fixes',
      'Citizen closes it',
    ],
    footer: 'A Smart India Hackathon prototype',
  },
  hi: {
    lang: 'hi',
    reach: 'झारखंड के सभी 24 ज़िलों के लिए',
    lead: 'एक बार बताइए।',
    follow: 'ठीक होने तक साथ रहिए।',
    other: 'Report it once. Follow it until it is fixed.',
    steps: [
      'नागरिक बताते हैं',
      'अधिकारी जाँचते हैं',
      'विभाग या विश्वविद्यालय ठीक करते हैं',
      'नागरिक बंद करते हैं',
    ],
    footer: 'स्मार्ट इंडिया हैकथॉन का एक प्रोटोटाइप',
  },
};

function page(copy: (typeof COPY)['en']): string {
  const steps = copy.steps
    .map(
      (step, index) =>
        `<span class="step${index === 3 ? ' last' : ''}"><b>${index + 1}</b>${step}</span>` +
        (index < 3 ? '<span class="arrow">→</span>' : ''),
    )
    .join('');
  return `<!doctype html><html lang="${copy.lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&family=IBM+Plex+Sans+Devanagari:wght@400;700&display=block">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #f7f9f8; color: #17211c;
    font-family: 'IBM Plex Sans', 'IBM Plex Sans Devanagari', sans-serif;
    padding: 72px 80px 56px; display: flex; flex-direction: column; }
  header { display: flex; justify-content: space-between; align-items: baseline; }
  .name { font-size: 32px; font-weight: 700; color: #1f6b45; }
  .name span { font-size: 28px; font-weight: 400; color: #56635c; margin-left: 14px; }
  .reach { font-size: 23px; color: #56635c; }
  h1 { font-size: 76px; line-height: 1.15; margin-top: 52px; }
  h1 span { display: block; color: #1f6b45; }
  .other { font-size: 32px; color: #56635c; margin-top: 14px; }
  .steps { margin-top: auto; padding-top: 26px; border-top: 2px solid #e2e8e4; font-size: 22px;
    display: flex; align-items: center; gap: 12px; white-space: nowrap; }
  .step b { color: #b45f14; margin-right: 8px; }
  .step.last { color: #1f6b45; font-weight: 700; }
  .arrow { color: #86918b; }
  footer { font-size: 21px; color: #86918b; margin-top: 30px; }
</style></head><body>
<header><div class="name">Akhra<span>अखरा</span></div><div class="reach">${copy.reach}</div></header>
<h1>${copy.lead}<span>${copy.follow}</span></h1>
<p class="other">${copy.other}</p>
<div class="steps">${steps}</div>
<footer>${copy.footer}</footer>
</body></html>`;
}

const outDir = join(process.cwd(), 'public', 'og');
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [locale, copy] of Object.entries(COPY)) {
    await tab.setContent(page(copy), { waitUntil: 'networkidle' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(outDir, `site-${locale}.png`) });
    process.stdout.write(`✓ public/og/site-${locale}.png\n`);
  }
} finally {
  await browser.close();
}
