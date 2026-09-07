---
status: "accepted"
date: "2026-08-20"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0008. Use Vitest for unit tests

## Context and Problem Statement

Two pieces of this project are pure logic and deserve tests that run in
milliseconds: the sanitization functions in `src/lib/sanitize.ts`
([0007](0007-centralise-sanitization-in-lib.md)) and the way the blog pages
handle a content collection that may be empty or populated
([0002](0002-author-content-as-markdown-content-collection.md)). Testing the
latter requires mocking `astro:content`, which is a virtual module that only
exists inside Astro's build. Which unit test runner handles that?

## Decision Drivers

* Must resolve TypeScript and Astro's module aliases without a separate transform
  configuration.
* Must be able to mock `astro:content`, a virtual module with no file on disk.
* Fast enough to run on every push without becoming something to skip
  ([0011](0011-run-ci-on-github-actions.md)).
* Coverage reporting available without assembling a second tool.

## Considered Options

* Vitest
* Jest
* Node's built-in test runner (`node:test`)

## Decision Outcome

Chosen option: "Vitest", configured in `vitest.config.ts` with
`dir: './src/__tests__'` and the `v8` coverage provider, run as
`vitest run --coverage`. Vitest reuses Vite's resolution pipeline, which is what
Astro is built on, so TypeScript and virtual modules such as `astro:content`
resolve with no additional configuration at all — the deciding factor, since
that is precisely where Jest would have needed the most work.

### Consequences

* Good, because there is no transform configuration to maintain. TypeScript,
  ESM and Astro's aliases work because the runner shares Astro's resolver.
* Good, because `vi.mock` handles the `astro:content` virtual module.
  `blog.test.ts` mocks `getCollection()` with `mockResolvedValue()` and resets it
  in `beforeEach`, covering both the empty and the populated case from one file.
  <br>*[Editorial note, 2026-09-01: `blog.test.ts` was deleted in `62ea1fe` — its
  tests asserted nothing. The claim about `vi.mock` holds; the empty and
  populated cases are now covered by `src/__tests__/integration/blog-index.test.ts`
  and `blog-routes.test.ts`. See [0015](0015-add-an-integration-test-scope.md).]*
* Good, because coverage is on by default in the `test:unit` script, so a drop in
  coverage is visible on every run rather than needing a separate command.
* Good, because the suite is fast enough to be the check that runs on every push
  to `dev`.
* Bad, because no coverage thresholds are configured. CI passes at any coverage
  level, so the numbers are informational only — coverage is measured, not
  enforced.
* Bad, because `exclude: ['e2e']` in `vitest.config.ts` replaces Vitest's default
  exclude list rather than adding to it. The `dir` setting is what keeps that
  from mattering; see [0010](0010-separate-unit-and-e2e-test-scopes.md).
  <br>*[2026-09-04: fixed. `vitest.config.ts` now spreads
  `configDefaults.exclude` alongside `'**/e2e/**'` and `'**/build/**'`, so the
  built-in `node_modules`/`dist` exclusions survive and the config no longer
  depends on `dir` to stay safe. 0010 recorded the same fix; this consequence
  was missed at the time. [0015](0015-add-an-integration-test-scope.md) is where
  the `build/` scope it now also excludes comes from.]*
* Neutral, because `coverage/` is generated output and gitignored (commit
  `0f15e89`), so reports are local and per-run rather than tracked over time.

### Confirmation

`pnpm test:unit` runs in both workflows in `.github/workflows/`, on every push to
`dev` and on every pull request into `master`.

## Pros and Cons of the Options

### Vitest

* Good, because it shares Vite's resolution with Astro, so TypeScript and virtual
  modules need no configuration.
* Good, because `vi.mock` is capable enough for module-level mocking of
  `astro:content`.
* Good, because `@vitest/coverage-v8` is a single devDependency away.
* Neutral, because its API is close enough to Jest's that Jest knowledge
  transfers directly.
* Bad, because the version here (`^4.1.11`) moves quickly, and its config
  defaults have changed across majors — the `exclude` behaviour above is an
  example of a default that is easy to get wrong.

### Jest

* Good, because it is the most widely known runner, with the largest body of
  documentation.
* Bad, because it needs `ts-jest` or a Babel transform to handle TypeScript, plus
  ESM configuration, plus `moduleNameMapper` entries for Astro's aliases — all
  configuration that Vitest simply does not require here.
* Bad, because mocking a Vite virtual module such as `astro:content` from Jest is
  awkward, and that is the single most important thing the suite has to do.

### `node:test`

* Good, because it is built in — no dependency, no version to track.
* Bad, because TypeScript needs a loader or a build step first.
* Bad, because its mocking is thin, and there is no module-level mock comparable
  to `vi.mock` for a virtual module.
* Bad, because coverage would be a separate tool to wire in.

## More Information

Configured in [`vitest.config.ts`](../../vitest.config.ts); tests live in
[`src/__tests__/unitTests/`](../../src/__tests__/unitTests/). The mocking
approach is described in
[`mock-my-test.md`](../../src/content/blog/mock-my-test.md).

Adding a coverage threshold would turn the second "Bad" above into an enforced
guarantee; that is the obvious next step for this decision.
