# Akhra

Every village in Jharkhand already has a place where people bring their
problems. An *akhra* is the open ground at the centre of the village — where
Oraon, Munda and Ho communities gather to talk things through and decide what to
do. This is the digital one, and unlike a complaints portal it doesn't stop at
"issue logged". It runs all the way to something actually being built.

Made for Smart India Hackathon problem statement 43, Government of Jharkhand.

## The problem we're trying to solve

Three groups in Jharkhand never meet.

Citizens report thousands of local problems a year — a handpump giving muddy
water, a school running on one teacher, wells drying a month early. Most of it
goes nowhere.

Universities need real project topics. Students invent fake ones instead, build
them for a viva, and throw them away.

Industry holds CSR budgets, labs and manufacturing capacity, with no pipeline of
validated problems worth funding.

Akhra is the pipeline between them.

## How it works

A citizen reports a problem with a photograph and a location, in whichever
language they're comfortable in. From there:

1. It gets sorted into one of ten domains, with severity read from the harm
   described rather than how upset the writer sounds.
2. It gets merged with everyone else reporting the same thing. Six people
   describing one broken handpump becomes one problem affecting 900 people, not
   six rows in a queue.
3. A government officer validates it. Every decision goes to an audit log.
4. It's routed to the university department that actually works on this, with
   the reasoning shown on screen — not just a number.
5. The university forms a student and faculty team and proposes a solution.
6. An industry partner backs it with mentoring, funding or prototyping.
7. Milestones are tracked until something is deployed.
8. The person who reported it is told what happened.

That last step is the one that matters. It's the difference between a grievance
system and this.

## The two bits that were hard

**Finding duplicates.** Two people describing the same contaminated handpump
share almost no words — one says "muddy water", the other says "the borewell
smells". Keyword search finds nothing. We embed both and compare meaning, and
merge anything above 0.86 cosine similarity within the same district or 25 km.

**Routing that explains itself.** We build an expertise profile for each of 34
university departments from what its faculty actually publish and teach, embed
those too, and match problems against them. The officer sees *"BIT Mesra, Civil
and Environmental Engineering — 24 faculty working on drinking water treatment
and groundwater contamination"*, and can override it.

## Stack

| | |
|---|---|
| Framework | Next.js 16, App Router |
| UI | Tailwind v4, shadcn, hand-built charts |
| Backend | Convex |
| Auth | Clerk |
| AI | Gemini, falling back to Groq, falling back to keywords |
| Embeddings | `gemini-embedding-001`, 768 dimensions, L2 normalised |

## On security

This holds photographs of people's homes, GPS coordinates, and complaints
against local administration. So:

- **There is no public database API.** Clients can only call server functions we
  wrote, and every one of them opens with `requireUser` or `requireRole`. A
  leaked key exposes nothing because there's nothing to call into.
- **Exact coordinates are officer-only.** Universities, industry and the public
  see the district and a coordinate fuzzed to roughly 500 metres.
- **Officer decisions are audit logged** in the same mutation that makes the
  change, not as an afterthought.
- **Only problem text and district reach a model prompt.** No names, no contact
  details, no photographs.
- Photos are served through short-lived signed URLs. Never a public bucket.

## About the data

`convex/data/problems.ts` holds 150 problems across all 24 Jharkhand districts.

Be clear about what this is. The **problems are real and documented** — fluoride
contamination in Garhwa's Majhiaon block, the Jharia underground coal fire,
7,600-odd schools running on a single teacher, elephant conflict in Saranda.
Every row carries a source note and a URL, and a status recording whether we
checked that source against the claim. We verified all 61 unique sources; four
turned out to be wrong and were corrected.

The **wording of each report is written as a citizen would describe it**,
because no dataset of real citizen complaints is published anywhere. We're not
going to pretend otherwise.

## Running it

```bash
pnpm install
cp .env.example .env.local     # add your Clerk keys
npx convex dev                 # leave running in its own terminal
pnpm dev
```

Some values live on the Convex deployment rather than in `.env.local`, because
they're read by functions running on Convex's servers:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
npx convex env set GOOGLE_GENERATIVE_AI_API_KEY <key>
npx convex env set GROQ_API_KEY <key>      # optional second provider
npx convex env set DEMO_MODE true          # enables the role switcher
```

Then seed and check:

```bash
npx convex run seed:institutions
npx convex run seed:embedDepartments
npx convex run seed:problems
npx convex run seed:embedProblems
npx convex run seed:partners
npx convex run selftest:runAll
```

## Tests

`selftest:runAll` runs eighteen assertions against the live deployment — seed
integrity, cluster consistency, whether stored priority scores still match the
formula, embedding dimensionality and normalisation, vector search quality, and
that public queries actually refuse unauthenticated callers.

It's caught things the UI hid. At one point routing was silently returning
nothing because department embeddings had been wiped; the app looked fine.

## Team

Lucky Jaiswal · Chetan Pathak · Shashank Mishra · Kavya Srivastava · Anshika ·
Kavya Tripathi
