# Decisions

`docs/ARCHITECTURE.md` says what Akhra does. These files say **why it does it that way, and what
was turned down** — the questions a new contributor would otherwise have to ask, or worse, answer
again from scratch.

One file per decision, numbered in the order they were taken. A decision is never edited to look
like it was always right: if it changes, a new file supersedes it and says so.

| #                                              | Decision                                                 | Status   |
| ---------------------------------------------- | -------------------------------------------------------- | -------- |
| [0001](0001-row-level-security.md)             | The database decides who may see a row                   | Accepted |
| [0002](0002-clerk-for-identity.md)             | Clerk holds the sign-in, Akhra holds the role            | Accepted |
| [0003](0003-modules-with-a-public-api.md)      | The app is modules, each with one public API             | Accepted |
| [0004](0004-classifier-ends-offline.md)        | AI classification always ends in an offline tier         | Accepted |
| [0005](0005-district-owns-the-report.md)       | A report belongs to its district, and can be transferred | Accepted |
| [0006](0006-two-tracks-for-a-report.md)        | A validated report goes to a department or a university  | Accepted |
| [0007](0007-no-paid-dependencies.md)           | Nothing may depend on a paid or unreachable service      | Accepted |
| [0008](0008-figures-cached-in-the-database.md) | Expensive figures are cached in a table, not a build     | Accepted |
| [0009](0009-map-without-a-map-server.md)       | The district map is generated SVG, not map tiles         | Accepted |
| [0010](0010-scheduled-jobs-are-batched.md)     | Every scheduled job claims a bounded batch               | Accepted |
| [0011](0011-tests-own-their-database.md)       | Tests run against their own database                     | Accepted |
| [0012](0012-two-layers-of-end-to-end-test.md)  | End to end is two layers; one of them runs in CI         | Accepted |

## Writing one

Copy the shape of any file here: **Context** (what was true), **Decision** (one sentence, in the
present tense), **Alternatives** (what was turned down and why), **Consequences** (what this costs
and what it buys). Short is the point — if it takes more than a page, the decision is probably
two decisions.
