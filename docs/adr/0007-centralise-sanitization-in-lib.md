---
status: "accepted"
date: "2026-08-14"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0007. Centralise sanitization in `src/lib/sanitize.ts`

## Context and Problem Statement

Blog URLs are derived from content IDs, which come from filenames. Two separate
pages need that derivation: `src/pages/blog/index.astro` builds the links, and
`src/pages/blog/[...slug].astro` generates the pages those links point at. If the
two ever disagree about how a filename becomes a slug, every affected link 404s.
Separately, content rendered into the page should not be able to introduce
markup. Where do those rules live?

## Decision Drivers

* The index and the detail route must be incapable of disagreeing about a slug.
* Slugs must not permit path traversal or characters that change how a URL is
  parsed.
* The rules must be testable without a browser, so they can run in the fast unit
  suite ([0008](0008-use-vitest-for-unit-tests.md)).
* Avoid adding a dependency for a problem that is currently small and fully
  understood.

## Considered Options

* A shared module, `src/lib/sanitize.ts`, imported by every consumer
* Inline sanitization at each call site
* A sanitization library such as DOMPurify

## Decision Outcome

Chosen option: "A shared module, `src/lib/sanitize.ts`". It exports
`sanitizeSlug()` and `sanitizeContentForDisplay()`, and both blog pages derive
URLs by calling `sanitizeSlug()`. That function is the single source of truth for
slug rules: the two pages cannot disagree, because they are running the same
code. Commit `6e58de9` removed the last inline duplicate in favour of the shared
function.

### Consequences

* Good, because the index and the detail route are structurally incapable of
  producing different slugs for the same post. This is the main reason for the
  decision — a broken link here is invisible until someone clicks it.
* Good, because both functions are plain string transforms with no framework
  dependency, so they are directly unit-testable and covered by
  `src/__tests__/unitTests/sanitize.test.ts`.
* Good, because there is one place to change if the URL scheme ever changes.
* Bad, because `sanitizeSlug()` is lossy and not injective. It replaces unsafe
  characters with hyphens, collapses runs of hyphens, and strips underscores
  entirely — so `my_post` and `mypost` both produce `mypost`. Two differently
  named files can collide onto one URL, and nothing in the build detects it.
* Bad, because `sanitizeContentForDisplay()` is a hand-rolled escaper. Its
  script-stripping regex matches only a simple, single-line, non-nested
  `<script>` form, and its event-handler removal is a blunt textual replacement.
  It is adequate here *only* because all content is author-written
  ([0002](0002-author-content-as-markdown-content-collection.md)); it must not be
  treated as a defence for untrusted input.
* Neutral, because a library would be more rigorous but would add a dependency,
  and — for a client-side sanitizer — a DOM at build time. Neither is warranted
  while the content is entirely first-party.

### Confirmation

`src/__tests__/unitTests/sanitize.test.ts` covers both functions and runs in both
CI workflows. The invariant to hold going forward: any new code that constructs a
blog URL must import `sanitizeSlug` rather than re-implement the rules — this is
enforced by review, not by tooling.

## Pros and Cons of the Options

### Shared module

* Good, because it makes divergence between the two pages impossible rather than
  merely unlikely.
* Good, because it is trivially testable in isolation.
* Neutral, because it is one more file, and the naming has to make its
  authoritative status obvious.
* Bad, because nothing mechanically prevents a future call site from bypassing
  it.

### Inline at each call site

* Good, because each page is self-contained and readable without following an
  import.
* Bad, because it is the arrangement that was actively removed in `6e58de9`:
  duplicated rules drift, and the drift shows up as 404s rather than as an error.
* Bad, because the logic can only be tested through the pages, not directly.

### A sanitization library

* Good, because it is far more robust against the HTML edge cases the hand-rolled
  version misses, and is maintained by people who track those edge cases.
* Neutral, because it would still need a project-specific slug function — it only
  addresses half the module.
* Bad, because it adds a dependency and, for DOM-based sanitizers, a DOM
  implementation at build time.
* Bad, because it solves a problem the site does not currently have: no untrusted
  content is ever rendered.

## More Information

Implemented in [`src/lib/sanitize.ts`](../../src/lib/sanitize.ts); consumers are
the two pages in [`src/pages/blog/`](../../src/pages/blog/). This is the
application-level counterpart to the transport-level headers in
[0006](0006-set-security-headers-in-build-config.md). Reasoning at the time is in
[`security-mostly-without-AI.md`](../../src/content/blog/security-mostly-without-AI.md).

This ADR must be superseded before any third-party or reader-submitted content is
rendered, because the second consequence above becomes a live vulnerability at
that point rather than an acceptable simplification. A build-time check for slug
collisions would also close the first.
