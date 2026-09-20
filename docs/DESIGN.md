# Akhra design system

The visual direction is set by the reference screens for sign in, create account, verification,
forgot/reset password and the welcome state: a deep forest green on white, soft mint washes, an
illustrated Jharkhand landscape, rounded cards, pill buttons, a numbered step indicator and tiled
code entry. This document turns that into rules every screen follows.

**Light theme only.** There is no dark mode, no toggle and no alternate background anywhere.

Tokens live in `apps/web/src/app/globals.css`. `pnpm --filter @akhra/web contrast` checks every
text/background pair below against WCAG AA and fails if one regresses.

## Palette

| Name         | Token      | Hex       | Role                                            |
| ------------ | ---------- | --------- | ----------------------------------------------- |
| **Forest**   | `sal`      | `#1F6B45` | Primary buttons, links, active step, focus ring |
| Forest deep  | `sal-deep` | `#15502F` | Hover and pressed states, text on mint          |
| Mint wash    | `sal-wash` | `#EAF4EE` | Selected cards, completed steps, success        |
| Mint         | `mint`     | `#F4F9F6` | Side panels, checklists, quiet sections         |
| White        | `surface`  | `#FFFFFF` | Cards, auth pages, inputs                       |
| Canvas       | `paper`    | `#F7F9F8` | Page ground behind cards in the app             |
| Well         | `well`     | `#EEF3F0` | Hover rows, inset areas                         |
| **Ink**      | `ink`      | `#17211C` | Headings and body text                          |
| Slate        | `subtle`   | `#56635C` | Secondary text, hints                           |
| Hairline     | `line`     | `#E2E8E4` | Card borders and dividers                       |
| Field edge   | `field`    | `#86918B` | Input borders (3.3:1 on white, WCAG 1.4.11)     |
| Signal red   | `danger`   | `#B42318` | Errors                                          |
| Signal amber | `warning`  | `#8A5A00` | Waiting states, development-only notices        |

Measured: ink on white 16.5, slate on white 6.3, forest on white 6.5, white on forest 6.5, forest
deep on mint 8.4, danger on white 6.6, amber on white 5.9. The reference's pale grey input outline
(about 1.4:1) was darkened to the lightest value that still meets the 3:1 input-boundary rule.

Charts keep their own validated categorical set (`--series-1…4`).

## Type

IBM Plex Sans with IBM Plex Sans Devanagari (400, 500, 600, 700); Plex Mono for reference codes.
Hindi gets a taller line height (`:lang(hi)`). Headings are bold and short; body copy is plain.

| Use                                 | Size                                     |
| ----------------------------------- | ---------------------------------------- |
| Hero headline (auth panel, landing) | 36–48 px, 700                            |
| Page title                          | 28–32 px, 700                            |
| Card title                          | 22–26 px, 700                            |
| Body                                | 16 px (phones), 14–15 px in dense tables |
| Labels                              | 14 px, 500                               |

## Shape and depth

- **Buttons are pills** (`rounded-full`), 44–48 px tall. Primary is solid forest with white text;
  secondary is white with a hairline; quiet is forest text.
- **Inputs** are 48 px tall, 8 px radius, field-edge border, an optional leading icon, and a forest
  border plus soft ring on focus. Passwords have a show/hide toggle.
- **Cards** are white, 20 px radius, hairline border and a soft two-layer shadow (`shadow-card`).
  Selectable cards (roles) turn mint with a forest border and a tick when chosen.
- Status badges are small pills with colour _and_ words.

## Components

- `StepProgress`: numbered circles joined by lines; done steps show a tick on mint, the current step
  is solid forest. On phones the step names collapse and the current one is written below.
- `OtpInput`: six square tiles, auto-advance, backspace to go back, paste fills every tile, and the
  one-time-code autofill hint.
- `PasswordChecklist`: the real rules (10+ characters, a letter, a number, not built from the email)
  ticking live on a mint panel.
- `Card`, `Button`, `Field`/`Input`, `Alert`, `StatusBadge`.
- `JharkhandLandscape`: one SVG scene of layered hills, sal trees, a rock outcrop with a waterfall and
  a river. It is cropped by its container: a tall panel beside sign-in, a band along the bottom of
  auth pages and the landing hero. It is always decorative (`aria-hidden`).
- `AkhraLogo`: leaf mark, wordmark and the line "Where Society Meets Innovation".

## Layouts

- **Auth** (`AuthShell`, every sign-in screen): one split layout. From 1024 px the left half is a
  mint panel with the logo and nav, the "Real Challenges. Collective Solutions." headline, three
  feature badges and the quote, then the landscape under a dark scrim carrying the live platform
  figures in white. The right half holds the language switcher, the card (up to 544 px), a
  "Your information is protected" panel and a footer. On phones the left panel is dropped and the
  logo moves into the top bar.
- **The auth card** swaps its contents in place: Sign In / Create Account tabs, then the code
  step, then a success state ("Your account is ready!", "Password reset successfully") with a
  landscape band along its bottom edge. Focus moves to each new step's heading.
- **Site header**: the logo (which is the way home), then How it Works, Success Stories, Impact and
  Resources with a green underline on the current page (from 1280 px; in the menu below the bar on
  smaller screens). Signed in, those give way to the person's own desk. On the right: the language
  switcher, then either a green Sign In button or the notification bell and the profile avatar at
  the far edge. The avatar is the person's Clerk photo (their Google photo when they signed up with
  Google) and opens a menu with exactly Manage account and Sign out.
  **Sign In is visible at every width** and is never folded into the menu: it is the single door
  into the product, and Akhra decides where a person lands from the role on their account.
- **Footer**: on every page, and only the copyright line, the privacy summary and the accessibility
  statement — the two a public service must state on every page. Everything navigational is in the
  header.
- **Home**: an uppercase eyebrow, the two-line headline, Get Started and Explore Challenges, with the
  hero photograph (`public/images/home-hero.jpg`, quote included) bleeding off the right edge behind a
  soft mask, with a location card and caption.
  Then the live stats band with its quote, the four-step process beside the "Why Akhra exists" panel,
  and the partnership strip — a statement of who stands behind Akhra, not a set of links.
- **Content pages** (How it Works, Success Stories, Impact, Resources, Browse challenges, Track,
  Report a problem, privacy): a mint intro band with the title, then white cards on the canvas. None
  of them sorts visitors by who they are — there is one sign-in, and it routes by role.
- **Dashboards**: the same tokens, denser; a side rail from 1024 px, tabs on smaller screens. A desk
  with one page gets no rail at all — a department officer and a student see the page full width.
- **Not found**: inside a locale, the branded page with Home and Track a report. Outside every
  locale (`/pricing`, a mistyped link) `app/not-found.tsx` answers in both languages with the same
  two links, because there is no locale to read.

## Phones first

A phone shows what someone needs at a glance, not a shrunken desktop:

- **Header**: the compact logo, a short language switcher (EN / हि), the bell and the avatar; the page
  links move to a scrolling row under the bar.
- **Filters fold** behind a "Filters" button showing how many are active (browse challenges, the
  state dashboard); search and the submit button stay visible.
- **Secondary figures fold** behind "More figures" on the dashboard; the headline figures, trend,
  categories, funnel and map stay in view.
- **Tables become cards**: `DataTable` and the admin invitation list render one card per row below
  640 px, with the full table from 640 px up.
- The home page drops its eyebrow line and the stats quote, and shows the figures two to a row.

## Escalation and reminders

Anything the scheduler surfaces uses the same tokens as the rest of the app: an escalated report carries a
small amber pill (`warning` on `warning-wash`) in the queue's metadata row, and the officer's queue header
carries one amber panel saying how many are waiting. No new colours, no admin-only styling.

## Breakpoints checked

360, 390, 430 (phones), 768 (small tablet), 1024 (large tablet / small laptop), 1280 (laptop),
1536 (large desktop). Nothing may scroll sideways; touch targets are at least 44 px.

## Motion and accessibility

Colour and opacity transitions only, 150 ms, off under `prefers-reduced-motion`. Every control has
a visible focus state. Colour is never the only signal.
