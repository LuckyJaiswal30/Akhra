# 4. AI classification always ends in an offline tier

**Status:** Accepted · 2026

## Context

Reports are classified into thematic domains by an LLM. Free AI tiers have rate limits, go down,
and change their terms. A citizen in a village submitting a report cannot be told "try later
because a model is busy".

## Decision

Classification is a chain — Gemini, then Groq, then an in-repo TF-IDF classifier trained on labelled
Jharkhand-flavoured fixtures. The chain is configuration (`AI_PROVIDER_CHAIN`), and the env schema
warns if it does not end in `tfidf`.

## Alternatives

- **One provider with retries.** A provider outage becomes a submission outage.
- **Classify later, in a job.** A reporter would see "uncategorised" and an officer would work
  blind for minutes or hours.

## Consequences

- Submission never fails because of AI. The worst case is a keyword-quality domain, which an
  officer can correct in the queue; the correction is recorded.
- Every fallback is logged at `warn`, and the dashboard shows which tier answered, so a silent
  degradation is visible rather than invisible.
- Duplicate detection follows the same shape: fingerprint, then trigram text similarity, then a
  model — and it reports when it ran degraded, because a duplicate check that quietly found nothing
  looks exactly like a report with no duplicates.
