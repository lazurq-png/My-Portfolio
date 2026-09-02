---
status: "accepted"
date: "2026-09-01"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0015. Add an integration test scope between the unit and e2e suites

## Context and Problem Statement

The project had two test layers and nothing between them. `sanitize.test.ts`
covers two pure functions in milliseconds; the Playwright suite drives four whole
pages across four browser projects. Anything that is neither a pure function nor
a rendered page went untested, and that turned out to be a real set of things:
`Layout.astro`'s prop fallbacks and canonical construction, `SiteNav.astro`'s
active-link rules, what `getStaticPaths` does with a hostile or colliding entry
id, how the blog index behaves against an empty collection, and whether the build
produced the files it was supposed to.

Some of these are not reachable from either existing layer. The empty-collection
path cannot be exercised from e2e without deleting every post.
[0008](0008-use-vitest-for-unit-tests.md) described a `blog.test.ts` covering
exactly that case, but the file was removed in `62ea1fe` for asserting nothing,
and the coverage went with it. Where should tests that span modules — but need no
browser — live?

## Decision Drivers

* The gap is real: a slug collision silently dropped a post from the build, and
  Astro reported it as a warning on an exit-zero build
  ([0014](0014-emit-security-headers-as-a-generated-headers-file.md) is the
  companion case).
* Must stay browserless and fast enough for the push job
  ([0011](0011-run-ci-on-github-actions.md)).
* Must not overlap the e2e suite. Re-asserting rendered page content in Node
  would duplicate work that four browsers already do better.
* Must not overlap the runners' scopes, per
  [0010](0010-separate-unit-and-e2e-test-scopes.md).

## Considered Options

* A third Vitest scope, `src/__tests__/integration/`, plus a build-output scope
* Extend the existing `unitTests/` directory
* Push the missing coverage into Playwright

## Decision Outcome

Chosen option: "A third Vitest scope plus a build-output scope". Four
directories, each owned by exactly one runner and one command:

| Directory | Contains | Command |
|---|---|---|
| `unitTests/` | Pure functions | `pnpm test:unit` |
| `integration/` | Module seams and `.astro` renders | `pnpm test:unit` |
| `build/` | Assertions about `dist/` | `pnpm test:build` |
| `e2e/` | Playwright | `pnpm test:e2e` |

`integration/` renders components with Astro's Container API
(`experimental_AstroContainer`) and mocks `astro:content` with `vi.mock` where a
test needs to control the collection. Both require `vitest.config.ts` to be built
from `getViteConfig` (`astro/config`) rather than Vitest's own `defineConfig` —
that is what resolves `.astro` imports and Astro's virtual modules. The cost is
about three seconds of extra startup.

`build/` is separate because its tests need `pnpm build` to have run first, which
the push job does not do. It gets its own `vitest.build.config.ts`, a plain
config, rather than a CLI `--exclude` override on the main one — 0010 records
that Vitest's `exclude` replaces rather than extends, and driving that from the
command line is how the scopes get tangled. That same fix is now applied to
`vitest.config.ts`, which spreads `configDefaults.exclude` instead of replacing
it, closing the trap 0010 flagged as "worth doing".

### Consequences

* Good, because the cases that motivated it are now covered: prop defaulting, the
  active-link rules, an empty collection, a traversal-shaped entry id, and
  one-page-per-post in the built output.
* Good, because it restores what 0008 claimed `blog.test.ts` did, honestly this
  time — the empty-collection test asserts the page still renders its list region
  with no cards, rather than asserting nothing.
* Good, because the two build-output tests are the only thing in the project that
  looks at what is actually deployed. Nothing did before, which is how a missing
  CSP survived.
* Good, because coverage now reports something meaningful about the components,
  where before it measured two functions.
* Bad, because `pnpm test:unit` went from roughly 350ms to a few seconds.
  `getViteConfig` resolves the Astro config and runs every integration hook on
  every run. Still fast enough for the push gate, but no longer instant.
* Bad, because the build-output tests cannot run on push, so a broken deployment
  contract is caught before `master` and not before `dev`.
* Bad, because there are now two Vitest configs and four test directories in a
  project with four pages. The split is justified by what each scope needs, but
  it is more structure than the size of the site suggests.
* Neutral, because container tests assert against an HTML string with regular
  expressions. No DOM library is installed, and for checking a handful of
  `<meta>` tags and `aria-current` attributes that is adequate; it would not
  scale to richer assertions.

### Confirmation

`pnpm test:unit` collects `unitTests/` and `integration/` and no e2e or build
spec; `pnpm test:build` collects only `build/`. Each was checked to fail for the
right reason before being accepted: a colliding post file, a header dropped from
the policy, and an altered `DEFAULT_TITLE` each broke exactly one test.

## Pros and Cons of the Options

### Third Vitest scope plus a build scope

* Good, because the directory decides the runner and the command, which is the
  property 0010 chose the current layout for.
* Good, because the build-output tests get to run at the one point in CI where a
  `dist/` exists, without slowing anything else down.
* Bad, because it needs a second Vitest config file and a fourth directory.

### Extend `unitTests/`

* Good, because it would need no new configuration at all.
* Bad, because the name would be a lie: these tests render components and mock
  virtual modules. 0010's argument is that the directory tells a contributor what
  a file is; a directory holding both would stop doing that.
* Bad, because the build-output tests would still need separating — they cannot
  run without a build.

### Push the coverage into Playwright

* Good, because it needs no new scope.
* Bad, because the empty-collection case would require deleting the content to
  test it, which is not something a test can do to a shared checkout.
* Bad, because it puts fast, deterministic assertions behind browser startup and
  the path-filtered e2e matrix, for cases where a browser adds nothing.

## More Information

Deliberately out of scope: `public/nav.js` and `public/theme-init.js` stay
Playwright-only. Both are driven by `matchMedia` and real event ordering, and
jsdom's `matchMedia` is a stub — a Node test would assert a fiction where the
`Mobile Chrome` project already exercises the real thing with real touch and
viewport emulation.

Also deliberately absent: any re-assertion of page headings, visible copy or meta
tags on the real pages. The e2e suite covers those across four browsers, and
duplicating them here would buy nothing but a second place to update.

See [`vitest.config.ts`](../../vitest.config.ts),
[`vitest.build.config.ts`](../../vitest.build.config.ts) and
[0010](0010-separate-unit-and-e2e-test-scopes.md).
