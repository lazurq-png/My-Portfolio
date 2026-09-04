---
status: "accepted"
date: "2026-08-25"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0011. Run CI on GitHub Actions, split by trigger

## Context and Problem Statement

There are now two test suites with very different costs: a browserless unit suite
that finishes in seconds ([0008](0008-use-vitest-for-unit-tests.md)) and a
four-browser end-to-end suite that needs browser binaries, system dependencies
and a virtual display ([0009](0009-use-playwright-for-e2e-tests.md)). Work
happens on `dev` and reaches `master` through a pull request. Running everything
on every push would make routine commits slow enough that the checks get ignored;
running nothing until merge defeats the point. What runs where?

## Decision Drivers

* Fast feedback on ordinary `dev` pushes, or the checks stop being useful.
* Nothing reaches `master` without the full cross-browser suite having passed.
* The repository is already on GitHub, so the CI provider should not add another
  account or another place to look when something breaks.
* Failures must be diagnosable after the fact, not only reproducible locally.

## Considered Options

* Two workflows split by trigger
* One workflow triggered on both push and pull request
* Rely on the host's build checks
* No CI

## Decision Outcome

Chosen option: "Two workflows split by trigger". `ci-push.yml` runs the unit
suite on pushes to `dev`; `ci-pull.yml` runs the unit suite and the end-to-end
suite as two separate jobs on pull requests into `master`. The split puts the
expensive suite exactly at the merge gate and keeps day-to-day pushes cheap,
which no single-workflow arrangement does as clearly.

*[2026-09-04: the split by trigger stands, but `ci-pull.yml` has grown from two
jobs to six: `unit-tests`, `check` ([0012](0012-use-typescript-strict-config.md)),
`build` (which is also the only place a `dist/` exists, so `pnpm test:build` runs
there — [0015](0015-add-an-integration-test-scope.md)), `changes`, `e2e-tests`
and `e2e-gate`. `changes` resolves `.github/e2e-filters.yml` into the spec matrix;
`e2e-gate` exists because a skipped matrix never reports a status, so it — not
`e2e-tests` — is the job to require on `master`, alongside `check`. The workflow
also sets `concurrency` with `cancel-in-progress`, so a force-push stops burning
the previous run's legs.]*

### Consequences

* Good, because a push to `dev` gets an answer in well under a minute, so the
  check is worth waiting for.
* Good, because `master` is protected by the full four-browser suite, and the two
  jobs in that workflow run in parallel and report independently — a unit failure
  surfaces without waiting on browsers.
* Good, because the Playwright HTML report is uploaded with `if: !cancelled()`
  and 30-day retention, so a CI-only failure can be inspected rather than guessed
  at.
  <br>*[2026-09-04: narrowed. The upload is now `if: failure()` with
  `retention-days: 7`, per matrix leg. A green run stores nothing, which is the
  point — but the seven-day window means a failure left unexamined for a week is
  no longer diagnosable from the artifact. The `github` reporter is now also
  enabled under CI, so failures surface as inline pull-request annotations
  without downloading anything.]*
* Bad, because the checkout / pnpm / Node / install block is duplicated in every
  job that needs it — five copies across the two files. Changing the Node version
  or the pnpm major means five edits, and missing one produces an inconsistency
  that is easy not to notice.
* Bad, because CI runs Node 24 while Cloudflare builds the deployed bundle on
  Node 22.16.0 ([0003](0003-host-on-cloudflare-with-wrangler.md)). Every test in
  these workflows therefore runs on a version that never ships, and the version
  that ships is never tested. The `engines.node >= 22.12.0` floor is exercised in
  production and nowhere else — the reverse of the usual mistake, and worse,
  because the untested version is the one users get.
* Bad, because getting WebKit working headless took roughly a dozen commits on a
  single day and the result is fragile: it needs
  `playwright install --with-deps`, a *second* explicit
  `playwright install --with-deps webkit`, and `xvfb-run --auto-servernum` to
  wrap the run. None of that is self-explanatory to a future reader of the
  workflow.
  <br>*[2026-09-04: this was already out of date when written — `9c60997`
  replaced all of it on 2026-08-31 with the
  `mcr.microsoft.com/playwright:v1.62.1-noble` container, which ships the
  browsers and their system dependencies. No `playwright install` step and no
  `xvfb-run` remain. Two container options carry the residual fragility and are
  commented in the workflow: `--user 1001`, because container jobs run as root
  by default and that breaks browser launch, and `--ipc=host`, because Chromium
  crashes on Docker's 64MB `/dev/shm`. The new maintenance burden is that the
  image tag must track `@playwright/test` in `pnpm-lock.yaml`.]*
* Neutral, because there is no deploy job and deployment does not go through these
  workflows at all. Cloudflare Pages builds from its own clone on every push
  ([0003](0003-host-on-cloudflare-with-wrangler.md)), so the relationship runs the
  opposite way from what this record first assumed: the live site is always
  current with its branch, and a deployed site does not imply these workflows went
  green. What protects the deploy is Cloudflare's build command running
  `pnpm run build:deploy`, which re-runs the type check and the unit suite in its
  own environment — not any status reported from here.
* Bad, because that arrangement makes the unit suite run twice per push, on two
  different Node versions, with no mechanism to notice if the results diverge.
  Playwright still runs only here, so the e2e suite gates the merge into `master`
  but never gates a deploy.

### Confirmation

Both workflows must be green. `ci-pull.yml` is the gate on `master`, so its
status is the operative check; the e2e job has a 60-minute timeout to stop a hung
browser from consuming the runner budget.

*[2026-09-04: the timeout is now `timeout-minutes: 15`, per matrix leg rather
than for the suite as a whole — a tighter budget, because each leg runs one spec.
And "green" needs qualifying: the checks to require on `master` are `e2e-gate`
and `check`. Requiring `e2e-tests` directly would leave a pull request pending
forever whenever the path filter selects no specs.]*

## Pros and Cons of the Options

### Two workflows split by trigger

* Good, because each trigger runs exactly the checks that are worth their cost at
  that point.
* Good, because the two files are individually short and readable.
* Neutral, because "which workflow runs when" is one more thing to know, though
  the filenames make it obvious.
* Bad, because the shared setup steps are duplicated with no composite action to
  factor them out.

### One workflow on both triggers

* Good, because there would be one file and no duplicated setup.
* Bad, because either every `dev` push pays for four browsers, or the conditional
  logic to skip them makes the single file harder to follow than two simple ones.

### Rely on the host's build checks

* Good, because it needs no configuration at all.
* Bad, because a hosting build check confirms the site compiles, not that it
  behaves — no unit tests, no browsers, no assertions.
* Bad, because it reports after a deploy rather than before a merge, which is the
  wrong side of the gate.

### No CI

* Good, because there is nothing to maintain.
* Bad, because both suites would then run only when remembered, and the
  cross-browser suite is precisely the one least likely to be run by hand.

## More Information

Workflows are in [`.github/workflows/`](../../.github/workflows/). The path to
getting this working is recorded in
[`CI-pipeline-with-git.md`](../../src/content/blog/CI-pipeline-with-git.md) — the
`main` versus `master` mismatch and the WebKit dependency attempts are both in
the commit history for 2026-08-25.

Three follow-ups:

1. Consider whether the duplication is worth removing — moving deployment into
   this workflow behind the existing jobs, and turning the Cloudflare Git
   integration off, would make one suite run instead of two and let the e2e job
   gate the deploy. The cost is losing per-branch previews.
2. Make CI test the Node version that actually ships. Cloudflare builds on Node
   22.16.0, so the fix is to move these workflows to Node 22 or pin Cloudflare's
   build to 24 — not, as this record first suggested, to raise `engines` to match
   Node 24.
3. Factor the shared checkout/pnpm/Node/install block into a composite action to
   remove the duplication, now five copies across the two files.
