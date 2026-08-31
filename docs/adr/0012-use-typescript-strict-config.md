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
* Bad, because `include: ["**/*"]` covers config files too, and
  `astro.config.mjs` sidesteps the resulting friction with a
  `/** @type {any} */` cast. The security header configuration
  ([0006](0006-set-security-headers-in-build-config.md)) is therefore the one
  place in the repository with no type checking at all — precisely where a silent
  typo is most expensive.
* Bad, because neither workflow runs `astro check` or `tsc --noEmit`. Type errors
  are caught in the editor and by whatever `astro build` happens to reject; they
  are not a gate on merging.
* Neutral, because `strictest` was not chosen. Its additions —
  `noUncheckedIndexedAccess` and similar — would add guards throughout for a
  class of bug that has not occurred here.

### Confirmation

Currently **unconfirmed by tooling**: nothing in CI enforces this. Running
`astro check` (or `tsc --noEmit`) as a job in
[`ci-push.yml`](../../.github/workflows/ci-push.yml) would make this decision
actually binding rather than advisory.

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

The two follow-ups are connected: adding `astro check` to CI, and removing the
`any` cast from `astro.config.mjs` so that the check has something to say about
it.
