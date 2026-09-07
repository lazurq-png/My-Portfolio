---
status: "accepted"
date: "2026-08-20"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0009. Use Playwright for end-to-end tests

> **Editorial note, 2026-09-04.** Commit `9c60997` ("fixed CI to be faster, by
> refactoring tests + adding containers", 2026-08-31) reworked the runner
> configuration on the same day this record was written, and several statements
> below describe the arrangement it replaced. The decision — Playwright, for
> WebKit and mobile emulation from one runner — is unaffected. Corrections are
> marked inline; in summary: the fourth project is desktop `webkit`, not
> `Mobile Safari`; the suite runs in parallel, not at `workers: 1`; and CI serves
> the built `dist/` rather than `pnpm dev`.

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

*[2026-09-04: still four projects, but the fourth is now `webkit`
(Desktop Safari), not `Mobile Safari` (iPhone 12) — so WebKit is still covered,
iOS viewport emulation no longer is. `Mobile Chrome` remains the only project
carrying `isMobile`/`hasTouch`. The `webServer` command is now
`process.env.CI ? 'pnpm preview' : 'pnpm dev'`: CI serves the built `dist/`
downloaded as an artifact — the same bundle Cloudflare deploys — and only local
runs use the dev server. `reuseExistingServer` is likewise CI-conditional.]*

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
  <br>*[2026-09-04: reversed in `9c60997`. The config now sets
  `fullyParallel: true` and leaves `workers` unset, so Playwright uses its
  default of cores / 2. The reasoning recorded there: the suite is read-only
  against a static site, so there was no shared state to serialise. What the
  serialisation had actually been hiding was an assertion-timeout problem, fixed
  properly — see the note on the next consequence.]*
* Bad, because Firefox needs `actionTimeout` and `navigationTimeout` raised to
  60s against a global default of 5s. That tolerance makes the suite pass, but it
  also means a genuine 30-second regression in Firefox would not be caught.
  <br>*[2026-09-04: still true, and there is now a third bump — Firefox also
  carries `expect: { timeout: 30_000 }`. The action and navigation overrides
  never covered `expect()`, so visibility assertions kept flaking against the
  global 5s budget once the suite started running in parallel. The concern above
  therefore applies to assertions as well: a regression under 30s in Firefox
  passes silently.]*
* Bad, because tests have asserted on hardcoded values that depend on content —
  a fixed number of blog posts, for one — which broke as posts were added.
  Assertions must not depend on collection size.
* Neutral, because running in CI needs `xvfb-run` and explicitly installed WebKit
  system dependencies; that cost is documented in
  [0011](0011-run-ci-on-github-actions.md).
  <br>*[2026-09-04: paid off. `9c60997` moved the job into the
  `mcr.microsoft.com/playwright` container, which ships the browsers and their
  system dependencies preinstalled, so neither the `xvfb-run` wrapper nor the
  dependency installs remain. The container tag has to track the
  `@playwright/test` version in `pnpm-lock.yaml` — that is the new cost, and it
  is a quieter one.]*

### Confirmation

`pnpm test:e2e` runs on every pull request into `master`, across all four
projects, with the HTML report uploaded as an artifact and retained for 30 days.
`forbidOnly` is set when `CI` is present, so a stray `test.only` fails the build
rather than silently skipping the rest of the suite.

*[2026-09-04: `forbidOnly` holds; the rest has drifted. The e2e job is now a
matrix with one leg per spec file, and the legs are selected by
`dorny/paths-filter` against `.github/e2e-filters.yml` — so a pull request runs
only the specs whose pages it touched, and one touching nothing they cover runs
no e2e at all. Each leg still runs all four projects. The HTML report is uploaded
`if: failure()` rather than unconditionally, with `retention-days: 7`. The check
to require on `master` is `e2e-gate`, not `e2e-tests`: a skipped matrix never
reports a status. See [0011](0011-run-ci-on-github-actions.md).]*

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

*[2026-09-04: done — see the note on that consequence. The piece now most worth
revisiting is the loss of iOS viewport coverage: swapping `Mobile Safari` for
desktop `webkit` kept the engine but dropped the only project that emulated an
iPhone, on a site whose layout requirement is mobile-first. Adding it back as a
fifth project costs one matrix leg per spec.]*
