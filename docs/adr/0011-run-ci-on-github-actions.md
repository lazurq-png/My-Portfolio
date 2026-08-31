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

### Consequences

* Good, because a push to `dev` gets an answer in well under a minute, so the
  check is worth waiting for.
* Good, because `master` is protected by the full four-browser suite, and the two
  jobs in that workflow run in parallel and report independently — a unit failure
  surfaces without waiting on browsers.
* Good, because the Playwright HTML report is uploaded with `if: !cancelled()`
  and 30-day retention, so a CI-only failure can be inspected rather than guessed
  at.
* Bad, because the checkout / pnpm / Node / install block is duplicated three
  times across the two files. Changing the Node version or the pnpm major means
  three edits, and missing one produces an inconsistency that is easy not to
  notice.
* Bad, because CI runs Node 24 while `package.json` declares
  `engines.node >= 22.12.0`. The declared floor is never exercised, so the
  project is verified on exactly one Node version and the range in `engines` is a
  claim rather than a tested guarantee.
* Bad, because getting WebKit working headless took roughly a dozen commits on a
  single day and the result is fragile: it needs
  `playwright install --with-deps`, a *second* explicit
  `playwright install --with-deps webkit`, and `xvfb-run --auto-servernum` to
  wrap the run. None of that is self-explanatory to a future reader of the
  workflow.
* Neutral, because there is no deploy job. Deployment stays manual through
  Wrangler ([0003](0003-host-on-cloudflare-with-wrangler.md)), which means CI
  green does not imply the live site is current.

### Confirmation

Both workflows must be green. `ci-pull.yml` is the gate on `master`, so its
status is the operative check; the e2e job has a 60-minute timeout to stop a hung
browser from consuming the runner budget.

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

Two follow-ups: factor the shared setup into a composite action to remove the
triplication, and either add a Node 22 entry to a matrix or raise `engines` to
match what is actually tested.
