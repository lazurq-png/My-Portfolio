---
status: "accepted"
date: "2026-08-26"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0012. Use TypeScript in Astro's `strict` config

## Context and Problem Statement

Astro ships three base TypeScript configurations — `base`, `strict` and
`strictest` — and a project can also opt out of TypeScript entirely and write
plain JavaScript. The code that most benefits from type checking here is the
handling of content-collection entries, where `updatedDate` and `heroImage` are
optional ([0002](0002-author-content-as-markdown-content-collection.md)) and the
layout props `title`, `description`, `canonicalPath` and `ogType` are all
optional with fallbacks. Which configuration?

## Decision Drivers

* Optional frontmatter and optional props are the most likely source of a runtime
  error here; the type system should catch exactly that.
* The Zod schema already describes the content shape — the type checker should
  build on it rather than duplicate it.
* Strictness should not add so much ceremony that a four-page site becomes
  tedious to change.

## Considered Options

* `astro/tsconfigs/base`
* `astro/tsconfigs/strict`
* `astro/tsconfigs/strictest`
* JavaScript with JSDoc type annotations

## Decision Outcome

Chosen option: "`astro/tsconfigs/strict`", set in `tsconfig.json` with
`include: [".astro/types.d.ts", "**/*"]` and `dist` excluded. It turns on
`strictNullChecks` and `noImplicitAny`, which is the pair that catches the
optional-value mistakes this codebase is actually prone to, without the extra
ceremony `strictest` adds for a project of this size.

### Consequences

* Good, because `strictNullChecks` makes an unguarded use of `updatedDate` or
  `heroImage` a compile error rather than an `undefined` rendered into the page.
* Good, because the Zod schema's inferred types flow through
  `getCollection()` into both blog pages, so the content contract is typed
  end to end without a hand-written interface.
* Good, because `Layout.astro`'s optional props are checked at every call site,
  which matters because only `[...slug].astro` passes them and the other pages
  rely on the defaults.
* Bad, because `include: ["**/*"]` covers far more than the source. Config files
  are checked, which is welcome; every gitignored build artefact was too, which
  is not — `coverage/` alone emitted thousands of diagnostics from its bundled
  `prettify.js` the first time `astro check` ran. `tsconfig.json` now excludes
  `coverage`, `test-results`, `playwright-report` and `blob-report` alongside
  `dist`, and that list has to grow whenever a tool starts writing somewhere new.
* Neutral, because `astro.config.mjs` opts in with `// @ts-check` and types its
  integration through `@returns {import('astro').AstroIntegration}`. The security
  header configuration ([0006](0006-set-security-headers-in-build-config.md)) is
  therefore checked after all, which matters because a silent typo there is
  among the most expensive in the repository.
* Bad, because the strict setting still costs the project TypeScript 7. The
  native compiler does not expose the programmatic API `astro check` is built on,
  so `typescript` is pinned to `^6.0.3` — the last release before the rewrite.
  Because 7.x is the `latest` tag, an unpinned `pnpm add -D typescript` silently
  reintroduces the break; pnpm only *warns* about the peer violation, and the
  failure surfaces as a confusing error from `astro check` rather than from the
  install. Astro tracks support at
  <https://github.com/withastro/roadmap/discussions/1321>.
* Neutral, because type errors gate merges into `master` but not pushes to `dev`.
  `ci-pull.yml` runs the check; `ci-push.yml` deliberately does not, keeping day-
  to-day pushes at the speed [0011](0011-run-ci-on-github-actions.md) chose them
  for. A type error can therefore sit on `dev` until a pull request is opened.
* Neutral, because `strictest` was not chosen. Its additions —
  `noUncheckedIndexedAccess` and similar — would add guards throughout for a
  class of bug that has not occurred here.

### Confirmation

**Confirmed by tooling.** `pnpm check` (`astro check`, via `@astrojs/check`) runs
as the `check` job in [`ci-pull.yml`](../../.github/workflows/ci-pull.yml), so a
type error cannot merge into `master`. The job also gates `e2e-tests`, which
keeps a type error from spending the four-browser matrix's runner minutes.

Two things are needed for it to actually block a merge: the job must be added to
the branch protection required checks on `master`, and `typescript` must stay on
6.x (see the consequence above).

The first run over the existing codebase produced exactly one error — a
hand-written cast in `src/__tests__/integration/content.test.ts` that described
`image()` as returning `z.ZodTypeAny` where the real `ImageFunction` returns a
specific `ZodObject`. All `.astro` templates and everything under `src/lib` were
already clean.

## Pros and Cons of the Options

### `astro/tsconfigs/strict`

* Good, because it catches the null and implicit-`any` errors that this code is
  realistically exposed to.
* Good, because it is Astro's recommended default, so it stays aligned with the
  framework's own expectations.
* Neutral, because it requires occasional narrowing that `base` would not.
* Bad, because it does not, on its own, cause anything to fail — that depends on
  a check being run.

### `astro/tsconfigs/base`

* Good, because it has the lowest friction and never blocks a change.
* Bad, because without `strictNullChecks` the optional-frontmatter bugs this
  project is most likely to hit pass straight through to runtime.

### `astro/tsconfigs/strictest`

* Good, because it is the safest option, and `noUncheckedIndexedAccess` in
  particular guards array access that `strict` leaves alone.
* Neutral, because a project this small would absorb the extra guards without
  much difficulty.
* Bad, because it adds ceremony for bug classes that have not appeared here, and
  the friction would be paid on every change.

### JavaScript with JSDoc

* Good, because it needs no compile step and no `.ts` files.
* Bad, because the content-collection types would have to be described by hand
  instead of inferred from the Zod schema, duplicating the contract.
* Bad, because `src/lib/sanitize.ts` and its tests are already TypeScript, so
  this would mean converting working code backwards.

## More Information

Configured in [`tsconfig.json`](../../tsconfig.json). Related:
[0002](0002-author-content-as-markdown-content-collection.md) for the schema the
types derive from, and [0006](0006-set-security-headers-in-build-config.md) for
the file that opts out of them.

Both original follow-ups are done: `astro check` runs in CI (see Confirmation),
and `astro.config.mjs` no longer casts its integration to `any`.

The remaining follow-up is the TypeScript 6 pin. When `@astrojs/check` supports
the native compiler, unpin `typescript` and drop the note from `CLAUDE.md`. Until
then, treat a `pnpm update` that moves `typescript` to 7.x as a break, not an
upgrade.
