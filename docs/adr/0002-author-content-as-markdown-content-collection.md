---
status: "accepted"
date: "2026-08-05"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0002. Author content as Markdown in a typed content collection

## Context and Problem Statement

The blog is written daily, in short posts, by the same person who writes the
code. Each post needs a title, a description, a publication date, and a stable
URL. The posts drive two pages — the index at `src/pages/blog/index.astro` and
the detail route at `src/pages/blog/[...slug].astro` — so the shape of a post has
to be reliable enough for both to depend on it. Where should that content live,
and what guarantees its shape?

## Decision Drivers

* Writing a post should be as cheap as writing a file; friction here means posts
  do not get written.
* A malformed post must fail loudly at build time, not render broken in
  production.
* Content should be versioned with the code, so a post and the change it
  describes can land together.
* No runtime data fetching — that would add a network dependency and force a
  `connect-src` entry into the CSP set in
  [0006](0006-set-security-headers-in-build-config.md).

## Considered Options

* Astro content collection over local Markdown files, validated with Zod
* A hosted headless CMS (Contentful, Sanity, or similar)
* MDX for every post
* One hand-written `.astro` page per post

## Decision Outcome

Chosen option: "Astro content collection over local Markdown files", configured
in `src/content.config.ts` as a `glob()` loader over `src/content/blog/` with a
Zod schema requiring `title`, `description` and `pubDate`, and allowing optional
`updatedDate` and `heroImage`. It is the only option that keeps authoring at
"add a file" while still failing the build on bad frontmatter.

### Consequences

* Good, because posts version alongside the code — the CI post and the CI
  workflow arrived in the same history, and a reader can see both.
* Good, because Zod rejects malformed frontmatter at build time, so a typo cannot
  reach production as a half-rendered post.
* Good, because there is no runtime fetch, no API key to hold, and no third-party
  origin to allowlist in the CSP.
* Good, because the schema types flow into both blog pages, which pairs with the
  strict TypeScript config in [0012](0012-use-typescript-strict-config.md).
* Bad, because there is no web editor. Publishing means a commit, a push, and a
  CI round trip — writing from a device without a checkout is not practical.
* Bad, because `pubDate` is written as `MM-DD-YYYY` and survives only because
  `z.coerce.date()` is permissive. The format is ambiguous, unenforced by the
  schema, and differs from the ISO dates used elsewhere in the project.
* Neutral, because `.mdx` matches the loader's glob pattern but no MDX
  integration is installed. An `.mdx` file would be picked up and then fail to
  render; the pattern is aspirational, not supported.

### Confirmation

`src/__tests__/unitTests/blog.test.ts` mocks `getCollection()` and asserts the
pages behave both when the collection is empty and when it has entries.
`pnpm build` fails on any frontmatter that violates the schema.

*[2026-09-04: that file no longer exists — it was deleted in `62ea1fe` for
asserting nothing. The empty and populated cases are now covered by
`src/__tests__/integration/blog-index.test.ts` and `blog-routes.test.ts`, which
mock `astro:content` the same way and render the pages through Astro's Container
API. See [0015](0015-add-an-integration-test-scope.md). The `pnpm build` half of
this Confirmation was always the stronger claim and is unchanged.]*

## Pros and Cons of the Options

### Astro content collection over local Markdown

* Good, because authoring is a file, and the schema is eight lines.
* Good, because content and code share one history and one review process.
* Neutral, because the schema has to be kept in step with what posts actually
  use — the unused `heroImage` and `updatedDate` fields are already drifting from
  reality.
* Bad, because publishing requires the full toolchain, so there is no
  low-friction path to posting from elsewhere.

### Hosted headless CMS

* Good, because posts could be written and published from anywhere, with a real
  editor and image handling.
* Bad, because it adds an account, an API key, and a build-time or runtime
  network dependency to a site that has neither today.
* Bad, because content would no longer be versioned with the code, so a post and
  the commit it describes could not travel together.
* Bad, because it is a paid or rate-limited service for a portfolio that
  currently costs nothing to run.

### MDX everywhere

* Good, because posts could embed live components.
* Bad, because no post needs a component; every one of them is prose.
* Bad, because it adds an integration and a compile step, and re-opens the
  zero-JavaScript question settled in
  [0001](0001-use-astro-as-site-framework.md).

### One `.astro` page per post

* Good, because it needs no collection, no loader, and no schema.
* Bad, because the page shell is duplicated per post and the index has to be
  maintained by hand.
* Bad, because there is nothing to validate — a missing date is simply a missing
  date, discovered by looking at the rendered page.

## More Information

Configured in [`src/content.config.ts`](../../src/content.config.ts); consumed by
the two pages under [`src/pages/blog/`](../../src/pages/blog/).

Worth revisiting the `pubDate` format: normalising posts to ISO `YYYY-MM-DD` and
tightening the schema would remove the ambiguity noted above.
