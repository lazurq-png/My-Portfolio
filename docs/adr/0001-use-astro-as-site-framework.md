---
status: "accepted"
date: "2026-08-05"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0001. Use Astro as the site framework

## Context and Problem Statement

The project is a personal portfolio with an attached development blog. Almost all
of it is static prose and layout: a landing page, a projects page, and a growing
set of Markdown posts. It has to be cheap to host, fast to load, and indexable by
search engines, and it is maintained by one person who is also using the project
to learn. Which framework should build it — or should it be built without one at
all?

## Decision Drivers

- Content is the primary artefact; the framework must treat Markdown as a
  first-class input rather than an afterthought.
- The output should be plain static files, so hosting stays free and there is no
  server-side execution surface to secure.
- Minimal JavaScript shipped to the browser — nothing on these pages is
  interactive.
  <br>*[2026-09-04: the driver held, the premise did not. The site has since
  gained a collapsing nav and a theme toggle, served as two small hand-written
  files in `public/`. That is still minimal — no framework runtime reaches the
  browser, which is what the driver was protecting — but "nothing is
  interactive" is no longer accurate. See
  [0005](0005-no-ui-framework-scoped-styles-only.md).]*
- Low ceremony for a single maintainer.
- The project doubles as a learning exercise in a current framework, which argues
  against hand-rolling everything.

## Considered Options

- Astro
- Next.js
- Eleventy
- Hand-written HTML and CSS, no build step

## Decision Outcome

Chosen option: "Astro", because it is the only option that satisfies both the
content drivers and the zero-JavaScript driver without extra machinery. Content
collections handle typed Markdown natively, and `.astro` components render to
HTML at build time with no client runtime, so no UI framework has to be adopted
alongside it.

### Consequences

- Good, because the build emits a fully static `dist/` with no client runtime,
  which is what makes the hosting decision in
  [0003](0003-host-on-cloudflare-with-wrangler.md) cheap and low-risk.
- Good, because content collections give schema-validated frontmatter out of the
  box — see [0002](0002-author-content-as-markdown-content-collection.md).
- Good, because component-scoped styles remove the need for a CSS framework —
  see [0005](0005-no-ui-framework-scoped-styles-only.md).
- Bad, because `.astro` is a framework-specific component format. Nothing in
  `src/components/` or `src/layouts/` ports to another stack; leaving Astro means
  rewriting the view layer.
- Bad, because Astro moves fast. The project is on `^7.2.7`, and major versions
  have historically required migration work — related to the release-age pin
  discussed in [0004](0004-use-pnpm-as-package-manager.md).
- Neutral, because adding interactivity later means adopting an island framework.
  That decision is deliberately deferred, not foreclosed.

### Confirmation

`pnpm build` must produce a fully static bundle. `astro.config.mjs` declares no
adapter and no server output; if either is ever added, this decision has changed
and needs a superseding ADR, because
[0003](0003-host-on-cloudflare-with-wrangler.md) depends on the output being
static assets only.

## Pros and Cons of the Options

### Astro

- Good, because Markdown and content collections are core features, not plugins.
- Good, because zero client-side JavaScript is the default rather than an
  optimisation to fight for.
- Good, because it needs no accompanying UI framework for static pages.
- Neutral, because `.astro` is a new syntax to learn — close enough to HTML and
  JSX that the cost is small.
- Bad, because the ecosystem, and the pool of answers for unusual problems, is
  smaller than React's. The icon resolution problem recorded in
  [0013](0013-render-icons-with-astro-icon.md) is an example of that cost.

### Next.js

- Good, because it has the largest ecosystem and the most transferable skills.
- Bad, because it ships a React runtime to the browser for a site with no
  interactivity at all.
- Bad, because static export is a constrained subset of the framework, so much of
  what makes Next.js valuable would be unusable here.

### Eleventy

- Good, because it is light, fast, and produces pure static output.
- Bad, because there is no typed content schema — the frontmatter validation
  relied on in [0002](0002-author-content-as-markdown-content-collection.md)
  would have to be hand-built.
- Bad, because it has no component-scoped styling, so
  [0005](0005-no-ui-framework-scoped-styles-only.md) would have needed a CSS
  toolchain instead.

### Hand-written HTML and CSS

- Good, because there is no build step, no dependencies, and nothing to upgrade.
- Bad, because every blog post would duplicate the page shell by hand. There are
  more than 10 posts already.
- Bad, because there is no frontmatter validation, no automatic post index, and
  no way to sort posts by date without maintaining the list manually.

## More Information

Recorded after the fact from the initial commits (`1e3d703`, `b4153bc`) and the
development blog post
[`testing-astro.md`](../../src/content/blog/testing-astro.md) of the same day.

Revisit if the site needs genuine client-side interactivity, or if an Astro major
upgrade becomes more expensive than a migration would be.
