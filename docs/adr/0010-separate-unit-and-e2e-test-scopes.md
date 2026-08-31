---
status: "accepted"
date: "2026-08-20"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0010. Keep unit and e2e test scopes disjoint

## Context and Problem Statement

Two test runners now live in the same repository — Vitest
([0008](0008-use-vitest-for-unit-tests.md)) and Playwright
([0009](0009-use-playwright-for-e2e-tests.md)) — and both look for files matching
similar patterns under `src/__tests__/`. Left alone, Vitest will collect the
Playwright specs and try to execute them. They fail, and the failure is
misleading: `@playwright/test` exports its own `test` and `expect`, so the errors
describe a fixture problem rather than "this file belongs to the other runner".
How are the two suites kept from colliding?

## Decision Drivers

* Each runner must see only its own files, with no overlap in either direction.
* Tests should stay near the code they cover.
* The fast suite must stay fast — it runs on every push and its value depends on
  not waiting for browsers.
* The two must be separable into independent CI jobs
  ([0011](0011-run-ci-on-github-actions.md)).

## Considered Options

* Mutually exclusive scopes declared in each runner's config
* One runner for both kinds of test
* Separate top-level directories, one per runner

## Decision Outcome

Chosen option: "Mutually exclusive scopes declared in each runner's config".
`vitest.config.ts` sets `dir: './src/__tests__'` with `exclude: ['e2e']`;
`playwright.config.ts` sets `testDir: './src/__tests__/e2e'`. The two sets never
intersect. This keeps all tests under one directory tree, close to the code,
while making the split explicit in configuration rather than implicit in naming.

### Consequences

* Good, because `pnpm test:unit` is browserless and fast, so the slow suite is
  opt-in rather than something every run pays for.
* Good, because CI can run the two as separate jobs, letting a unit failure
  report immediately without waiting on four browser projects.
* Good, because a contributor adding a test does not have to know which runner
  will claim their file — the directory decides.
* Bad, because the invariant is spread across two config files and nothing
  enforces it. Changing `testDir` in one without updating `exclude` in the other
  reintroduces the collision, and the resulting error message will not point at
  the cause.
* Bad, because Vitest's `exclude` *replaces* its default exclude list rather than
  extending it. Setting `exclude: ['e2e']` therefore drops the built-in
  exclusions for `node_modules` and `dist`. Only the narrow `dir` scope keeps
  that from becoming a problem — the configuration is correct today but fragile,
  and would break in a surprising way if `dir` were ever widened.
* Neutral, because the two suites cannot share helpers or fixtures across the
  boundary. Given how different their assertions are, that is no real loss.

### Confirmation

`pnpm test:unit` must not execute any file under `src/__tests__/e2e/`, and
`pnpm test:e2e` must not pick up anything outside it. This is verified by
observing what each command collects; there is no automated assertion of the
invariant.

## Pros and Cons of the Options

### Mutually exclusive scopes in config

* Good, because it keeps all tests in one tree, next to the source.
* Good, because it needs no directory restructuring and no naming convention to
  remember.
* Neutral, because it makes each runner's config slightly more opinionated than
  its defaults.
* Bad, because the guarantee lives in two files that must be changed together,
  and Vitest's exclude-replacement semantics make one of them a trap.

### One runner for both

* Good, because there would be a single config, a single command and no
  possibility of overlap at all.
* Bad, because Vitest cannot drive real browsers the way Playwright does, and
  Playwright is a poor unit runner — mocking `astro:content` in it would be far
  harder than `vi.mock`.
* Bad, because every run would pay browser startup cost, destroying the fast
  feedback loop that makes the unit suite worth running on each push.

### Separate top-level directories

* Good, because the split would be visible in the filesystem, needing no config
  at all to enforce, and could not be broken by a config edit.
* Neutral, because it is the more common convention in larger projects.
* Bad, because it moves e2e tests away from the source tree they exercise, and
  adds a second top-level directory to a project with four pages.

## More Information

See [`vitest.config.ts`](../../vitest.config.ts) and
[`playwright.config.ts`](../../playwright.config.ts). The split is also recorded
in [`CLAUDE.md`](../../CLAUDE.md) so that automated contributors do not
reintroduce the overlap.

Worth doing: restore Vitest's default exclusions explicitly alongside `'e2e'`, so
the configuration is safe independently of `dir`.
