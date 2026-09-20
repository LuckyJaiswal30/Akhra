import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Every page a visitor can reach without an account, in both languages.
 *
 * The assertions are deliberately shallow — a heading, a language, a clean console. Anything deeper
 * belongs in `tests/`, where it runs against a database instead of a browser. What this catches is
 * the class of failure those tests cannot see: a page that throws while rendering, a translation
 * key that reaches the screen raw, a client component that breaks hydration.
 */

/** next-intl prints a key it cannot resolve. These are the namespaces the public pages read. */
const RAW_MESSAGE_KEY =
  /\b(brand|nav|common|footer|landing|how|stories|impact|resources|problems|track|submit|privacy|thread|lifecycle|errors)\.[a-zA-Z]/;

interface PageCheck {
  path: string;
  heading: { en: string; hi: string };
}

const PAGES: PageCheck[] = [
  { path: '/', heading: { en: 'Real Challenges.', hi: 'असली चुनौतियाँ।' } },
  { path: '/how-it-works', heading: { en: 'How Akhra works', hi: 'अखरा कैसे काम करता है' } },
  { path: '/problems', heading: { en: 'Browse challenges', hi: 'चुनौतियाँ देखें' } },
  { path: '/success-stories', heading: { en: 'Success Stories', hi: 'सफलता की कहानियाँ' } },
  { path: '/impact', heading: { en: 'Our Impact', hi: 'हमारा प्रभाव' } },
  { path: '/resources', heading: { en: 'Resources', hi: 'संसाधन' } },
  { path: '/track', heading: { en: 'Track a report', hi: 'रिपोर्ट की स्थिति' } },
  { path: '/submit', heading: { en: 'Report a problem', hi: 'समस्या दर्ज करें' } },
  { path: '/accessibility', heading: { en: 'Accessibility', hi: 'सुगम्यता' } },
  {
    path: '/privacy',
    heading: {
      en: 'How Akhra uses your information',
      hi: 'अखरा आपकी जानकारी का उपयोग कैसे करता है',
    },
  },
];

/** Warnings are the browser's business; an error is ours. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

for (const locale of ['en', 'hi'] as const) {
  // The default locale has no prefix; Hindi does.
  const prefix = locale === 'en' ? '' : '/hi';

  test.describe(`public pages in ${locale}`, () => {
    for (const { path, heading } of PAGES) {
      test(`${path} renders`, async ({ page }) => {
        const errors = watchConsole(page);
        const response = await page.goto(`${prefix}${path}`);

        expect(response?.status(), `${path} responded ${response?.status()}`).toBeLessThan(400);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.getByRole('heading', { level: 1 })).toContainText(heading[locale]);

        // A missing translation reaches the screen as "namespace.key", never as prose.
        await expect(page.locator('body')).not.toContainText(RAW_MESSAGE_KEY);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }

    test('the header leads to sign in and the footer to privacy', async ({ page }) => {
      await page.goto(`${prefix}/`);
      await expect(page.getByRole('link', { name: /sign in|साइन इन/i }).first()).toBeVisible();
    });
  });
}

test('an unknown reference code says so rather than failing', async ({ page }) => {
  await page.goto('/track?ref=AKH-2026-000000');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(page.url()).toContain('/track');
});

test('an unknown page returns a usable 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('link').first()).toBeVisible();
});
