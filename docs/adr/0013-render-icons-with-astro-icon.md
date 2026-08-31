---
status: "accepted"
date: "2026-08-28"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0013. Render icons with astro-icon and a bundled icon set

## Context and Problem Statement

The landing page shows a row of technology badges — C, C#, C++, JavaScript,
TypeScript, Python, Astro, Next.js, CSS and others — each a recognisable brand
logo. That is a dozen or more SVGs that need to render consistently, scale with
the layout, and be cheap to add to when the list grows. The CSP set in
[0006](0006-set-security-headers-in-build-config.md) allows no third-party script
or asset origins beyond Google Fonts, so whatever is chosen must not fetch
anything at runtime. How are icons rendered?

## Decision Drivers

* No runtime network request, so the CSP stays as narrow as it is.
* Adding a badge should be a one-line change, not an asset hunt plus a commit of
  a binary.
* Icons must be real SVG so they scale and can be styled with CSS classes such as
  the existing `badge` and `badge-dark`.
* No accumulation of near-duplicate SVG markup in the page source.

## Considered Options

* `astro-icon` with the `@iconify-json/devicon` set installed as a dependency
* Raw inline SVG, one per icon, pasted into the page
* An icon font, or Iconify's runtime API over a CDN

## Decision Outcome

Chosen option: "`astro-icon` with `@iconify-json/devicon`". The integration is
registered in `astro.config.mjs` and icons are used as
`<Icon name="devicon:typescript" />`. Icon data comes from an installed package
and is resolved at build time, so nothing is fetched when the page loads —
the only option of the three that satisfies both the CSP driver and the one-line
authoring driver at once. `src/icons/` remains available for local SVGs,
referenced as `local:filename`.

### Consequences

* Good, because icon data is a build-time dependency. The rendered page makes no
  request to an icon CDN, so `img-src` and `connect-src` in the CSP need no
  third-party entry.
* Good, because adding a technology badge is a single `<Icon>` line — no file to
  find, download, optimise and commit.
* Good, because the output is inline SVG, so the existing `badge` and
  `badge-dark` classes style it directly and it scales cleanly on the mobile
  viewports covered in [0009](0009-use-playwright-for-e2e-tests.md).
* Bad, because the whole `devicon` set is installed to use roughly a dozen icons.
  Only the referenced icons reach the output, so the shipped page is unaffected,
  but the install and the lockfile carry the full set.
* Bad, because icon resolution failed and had to be fixed twice, permanently only
  in commit `a8c4d5c`. The failure mode was icons silently not loading rather
  than a build error, which is the expensive kind — it cost debugging time across
  two separate days.
* Neutral, because it adds two dependencies (`astro-icon` and the icon set) to a
  project that otherwise has one. Both are build-time only.

### Confirmation

Icons must be inlined into the built HTML: inspect `dist/` after `pnpm build` and
confirm the SVG markup is present. A network request to an icon CDN from the
rendered page means the decision has been violated — and, given the CSP, would
also fail at runtime.

## Pros and Cons of the Options

### astro-icon with a bundled icon set

* Good, because icons resolve at build time, with no runtime dependency of any
  kind.
* Good, because authoring is one line and the icon name is self-documenting.
* Neutral, because it introduces a naming convention (`devicon:` versus
  `local:`) that has to be known — it is written down in
  [`src/icons/README.md`](../../src/icons/README.md).
* Bad, because when it misbehaves it does so quietly, and the smaller Astro
  ecosystem means fewer existing answers to search for.

### Raw inline SVG per icon

* Good, because it has no dependencies and no integration that can silently fail.
* Good, because the markup is completely explicit — what is in the file is what
  renders.
* Bad, because a dozen full SVG paths inline make `index.astro` extremely hard to
  read, and adding a badge means sourcing and optimising an SVG by hand.
* Bad, because there is no consistency guarantee across icons pasted from
  different sources — differing viewBoxes and fill conventions.

### Icon font or a runtime CDN

* Good, because it removes the dependency from `package.json` and keeps the
  install small.
* Bad, because it requires loosening the CSP to allow a third-party origin,
  working directly against [0006](0006-set-security-headers-in-build-config.md).
* Bad, because it makes the page's appearance depend on a third party's
  availability, for content that could just as well be static.
* Bad, because icon fonts specifically have poor accessibility characteristics
  and render as boxes when the font fails to load.

## More Information

Integration registered in [`astro.config.mjs`](../../astro.config.mjs); icons are
used in [`src/pages/index.astro`](../../src/pages/index.astro); the local-SVG
convention is documented in
[`src/icons/README.md`](../../src/icons/README.md).

If the dependency weight of the full `devicon` set ever matters, individual
Iconify sets can be swapped in — but note that the runtime-CDN alternative stays
ruled out for as long as [0006](0006-set-security-headers-in-build-config.md)
stands.
