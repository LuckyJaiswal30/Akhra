import type { Metadata } from 'next';

/**
 * The 404 for an address that is outside every locale — `/pricing`, a mistyped link, an old
 * bookmark. Next.js matches `[locale]` against that first segment, the locale layout rejects it,
 * and the not-found inside `[locale]` is never reached; without this file a visitor would land on
 * the framework's own black-and-white page, with no way back into Akhra.
 *
 * It renders its own document, because the root layout deliberately owns no `<html>` — the locale
 * layout does — and it cannot know which language to answer in, so it answers in both.
 */
export const metadata: Metadata = {
  title: 'Page not found | Akhra',
  robots: { index: false },
};

const LINK =
  'inline-flex min-h-12 items-center justify-center rounded-full px-6 text-base font-medium';

export default function NotFound() {
  return (
    <html lang="en">
      <body className="bg-paper text-ink font-sans">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
          <p className="text-sal text-sm font-semibold tracking-[0.22em] uppercase">Akhra</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">We could not find that page</h1>
          <p lang="hi" className="text-ink mt-1 text-2xl font-semibold">
            यह पृष्ठ नहीं मिला
          </p>
          <p className="text-subtle mt-5">
            The link may be mistyped, or the page may have moved. If you were tracking a report,
            check its reference code.
          </p>
          <p lang="hi" className="text-subtle mt-2">
            लिंक गलत लिखा हो सकता है, या पृष्ठ हट गया हो। यदि आप रिपोर्ट देख रहे थे, तो उसका संदर्भ
            कोड जाँचें।
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/" className={`bg-sal text-on-sal ${LINK}`}>
              Home / मुख्य पृष्ठ
            </a>
            <a href="/track" className={`border-line text-ink border bg-white ${LINK}`}>
              Track a report / रिपोर्ट की स्थिति
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
