---
status: "accepted"
date: "2026-08-20"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0009. Use Playwright for end-to-end tests

## Context and Problem Statement

Unit tests ([0008](0008-use-vitest-for-unit-tests.md)) cover the logic but not
the thing users actually receive: whether the pages render, whether navigation
between them works, whether a blog post reached from the index actually exists at
that URL, and whether any of it holds up on a phone-sized viewport. The site is
built mobile-first and is served to whatever browser a reader has. What verifies
the rendered site?

## Decision Drivers

* Must cover Chromium, Firefox and WebKit — a portfolio is read on whatever the
  reader happens to use, including iOS.
* Must cover mobile viewports, since the layout is mobile-first.
* Must run headless in CI on Linux ([0011](0011-run-ci-on-github-actions.md)).
* Should manage its own server, so the suite is one command rather than a
  documented two-step ritual.

## Considered Options

* Playwright
* Cypress
* No end-to-end tests; rely on unit tests and manual checking

## Decision Outcome

Chosen option: "Playwright", configured in `playwright.config.ts` with four
projects — `chromium`, `firefox`, `Mobile Chrome` (Pixel 5) and `Mobile Safari`
(iPhone 12) — and a `webServer` block that starts `pnpm dev` and reuses an
existing one if present. Playwright is the only option that covers WebKit, which
is not optional for a site read on iPhones, and its device emulation covers the
mobile-first requirement from the same runner.

### Consequences

* Good, because one runner and one config cover three engines and two mobile
  viewports; there is no second tool for mobile.
* Good, because `webServer` makes the suite self-contained. The earlier approach
  of running a server by hand was wrong in a way that produced confusing
  failures, and this removes that whole class of problem.
* Good, because `trace: 'on-first-retry'` and the uploaded HTML report make a CI
  failure diagnosable after the fact rather than only reproducible locally.
* Bad, because `workers: 1`. Running browsers in parallel produced
  non-deterministic failures; serialising the suite fixed them, but the
  underlying race was worked around rather than diagnosed. The suite is slower
  than it needs to be, and the real cause is still unknown.
* Bad, because Firefox needs `actionTimeout` and `navigationTimeout` raised to
  60s against a global default of 5s. That tolerance makes the suite pass, but it
  also means a genuine 30-second regression in Firefox would not be caught.
* Bad, because tests have asserted on hardcoded values that depend on content —
  a fixed number of blog posts, for one — which broke as posts were added.
  Assertions must not depend on collection size.
* Neutral, because running in CI needs `xvfb-run` and explicitly installed WebKit
  system dependencies; that cost is documented in
  [0011](0011-run-ci-on-github-actions.md).

### Confirmation

`pnpm test:e2e` runs on every pull request into `master`, across all four
projects, with the HTML report uploaded as an artifact and retained for 30 days.
`forbidOnly` is set when `CI` is present, so a stray `test.only` fails the build
rather than silently skipping the rest of the suite.

## Pros and Cons of the Options

### Playwright

* Good, because it is the only mainstream runner with real WebKit support, which
  no other option here provides.
* Good, because device descriptors give mobile viewports without a second tool.
* Good, because `webServer`, traces and the HTML reporter are built in rather
  than assembled from plugins.
* Neutral, because browser binaries and their system dependencies have to be
  installed in CI — straightforward, but it took several attempts to get the
  WebKit dependencies right.
* Bad, because parallelism had to be disabled to get a stable suite, so the
  headline speed advantage is not being realised here.

### Cypress

* Good, because its interactive runner and time-travel debugging are excellent
  for authoring tests.
* Bad, because it has no WebKit support of the kind needed, so Safari and iOS —
  the reason for two of the four projects — would go untested.
* Bad, because it needs the same warm-up and timing tolerance for parallel runs,
  so it would not have avoided the flakiness above.

### No end-to-end tests

* Good, because there is nothing to maintain and no CI time spent.
* Bad, because nothing would verify that a link on the blog index resolves to a
  page that exists — the exact failure mode the shared slug function in
  [0007](0007-centralise-sanitization-in-lib.md) is designed to prevent, left
  unverified.
* Bad, because mobile layout regressions would only be found by checking by hand,
  on a site whose layout requirement is mobile-first.

## More Information

Configured in [`playwright.config.ts`](../../playwright.config.ts); specs live in
[`src/__tests__/e2e/`](../../src/__tests__/e2e/). The parallelism problem and the
server fix are recorded in
[`playwright-or-wrong.md`](../../src/content/blog/playwright-or-wrong.md) and
[`mock-my-test.md`](../../src/content/blog/mock-my-test.md).

The `workers: 1` setting is the piece of this decision most worth revisiting:
finding the actual race would let the suite run in parallel and shorten every
pull request.
