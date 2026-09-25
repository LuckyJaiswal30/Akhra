import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

const RAW_MESSAGE_KEY =
  /\b(brand|nav|common|footer|landing|how|stories|impact|resources|problems|track|submit|privacy|thread|lifecycle|errors)\.[a-zA-Z]/;

interface PageCheck {
  path: string;
  heading: { en: string; hi: string };
}

const PAGES: PageCheck[] = [
  { path: '/', heading: { en: 'Report a local problem.', hi: 'अपने इलाके की समस्या दर्ज करें।' } },
  { path: '/how-it-works', heading: { en: 'How Akhra works', hi: 'अखरा कैसे काम करता है' } },
  { path: '/problems', heading: { en: 'Browse reports', hi: 'रिपोर्टें देखें' } },
  { path: '/success-stories', heading: { en: 'Success stories', hi: 'सफलता की कहानियाँ' } },
  { path: '/impact', heading: { en: 'Impact so far', hi: 'अब तक का असर' } },
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

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

for (const locale of ['en', 'hi'] as const) {
  const prefix = locale === 'en' ? '' : '/hi';

  test.describe(`public pages in ${locale}`, () => {
    for (const { path, heading } of PAGES) {
      test(`${path} renders`, async ({ page }) => {
        const errors = watchConsole(page);
        const response = await page.goto(`${prefix}${path}`);

        expect(response?.status(), `${path} responded ${response?.status()}`).toBeLessThan(400);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.getByRole('heading', { level: 1 })).toContainText(heading[locale]);

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
