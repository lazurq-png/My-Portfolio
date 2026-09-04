---
status: "accepted"
date: "2026-08-11"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0005. Ship no UI framework; scoped styles only

> **Editorial note, 2026-09-04.** Two premises below have since changed, and
> neither changes the decision. The site now has interactive behaviour — a
> responsive nav that collapses behind a hamburger, and a theme toggle — driven
> by two hand-written files in `public/`, not by an island; the Confirmation
> below (no `client:*` directive) still passes, and no UI framework has been
> adopted. And the shared-token layer this record lists as its main cost now
> exists in `Layout.astro`. Both are marked inline.

## Context and Problem Statement

Astro can host components from React, Svelte, Vue and others, and the usual
default for a portfolio is to reach for one of those plus a CSS framework such as
Tailwind. This site has four page types — landing, projects, blog index, blog
post — and none of them has interactive behaviour beyond links and hover states.
It does need a mobile-first responsive layout. Does the project adopt a UI
framework and a styling toolchain, or stay with what Astro provides?

## Decision Drivers

* Keep JavaScript shipped to the browser at zero, which is the main reason Astro
  was chosen in [0001](0001-use-astro-as-site-framework.md).
* Mobile-first responsive layout is a requirement of the project.
* Keep the number of moving parts small enough for one maintainer to hold in
  their head.
* Every added dependency is another thing to upgrade and another entry to
  justify in the CSP from
  [0006](0006-set-security-headers-in-build-config.md).

## Considered Options

* Plain `.astro` components with scoped `<style>` blocks
* Tailwind CSS
* A UI framework island (React, Svelte or Vue) plus a component library

## Decision Outcome

Chosen option: "Plain `.astro` components with scoped `<style>` blocks". Nothing
on these pages requires a runtime, and Astro's per-component style scoping
already provides the isolation a CSS framework would be adopted to get. Adding
either would buy capability the site does not use, at a cost the other decisions
here are actively trying to avoid.

### Consequences

* Good, because `dist/` ships no framework runtime at all, so the CSP's
  `script-src` can stay narrow — `'self'` plus `https://cdn.astro.build` and
  nothing else.
* Good, because styles are colocated with the markup they style and scoped to it.
  Deleting a component deletes its CSS, so there is no orphaned stylesheet
  accumulating over time.
* Good, because there is no CSS build step, no purge configuration, and no class
  ordering conventions to enforce.
* Bad, because there are no shared design tokens. Spacing, colour and typography
  values are repeated across `index.astro`, `projects.astro`,
  `blog/index.astro` and `Layout.astro`, so a visual change means editing several
  files and risks them drifting apart.
  <br>*[2026-09-04: resolved, by the cheaper fix this record proposed rather than
  by a build step. The `<style is:global>` block in `Layout.astro` now owns the
  colour, type-scale, spacing, radius and `--measure` tokens plus the
  `.app-shell` / `.page-shell` / `.post-card` primitives, and pages compose those
  instead of hard-coding values. The horizontal gutter is applied once, on
  `.app-shell`, which is what keeps the nav rail and the content column aligned
  on every page. The cost is now the inverse: nothing mechanically stops a page
  from reintroducing a one-off colour or `font-size`, so the discipline is
  enforced by review.]*
* Bad, because styling that crosses component boundaries has to be handled per
  file. The navigation active-link fix in commit `0b05d4a` is an instance of
  that: scoping helps until the thing being styled depends on state owned
  elsewhere.
* Neutral, because if real interactivity is ever needed, an island framework can
  be added for that one component. This decision defers that choice; it does not
  prevent it.

### Confirmation

`package.json` `dependencies` must contain no UI framework and no CSS framework —
today it holds only `astro`, `astro-icon` and an Iconify icon set. No `.astro`
file may use a `client:*` directive; the first one to appear means this ADR needs
superseding.

*[2026-09-04: both still hold — `dependencies` is unchanged and there is no
`client:*` directive anywhere in `src/`. But the check is now narrower than the
decision it guards: `public/nav.js` and `public/theme-init.js` ship real
client-side JavaScript that no `client:*` scan would catch. They are plain
same-origin files precisely so they satisfy `script-src 'self'` without an
inline hash or a CSP change ([0014](0014-emit-security-headers-as-a-generated-headers-file.md)).
That choice — hand-written scripts in `public/` rather than an island — is a
decision this record does not cover and that no ADR yet does.]*

## Pros and Cons of the Options

### Plain `.astro` with scoped styles

* Good, because it adds zero dependencies and zero client-side bytes.
* Good, because scoping is automatic and requires no naming discipline (no BEM,
  no CSS modules setup).
* Neutral, because Astro emits inline styles for scoped blocks, which is why the
  CSP needs `'unsafe-inline'` in `style-src` — an accepted cost, documented in
  [0006](0006-set-security-headers-in-build-config.md).
* Bad, because there is no shared token layer, so consistency across pages is
  maintained by hand.

### Tailwind CSS

* Good, because utility classes would give exactly the shared spacing and colour
  scale that is missing today, and its responsive prefixes suit a mobile-first
  layout well.
* Neutral, because the generated stylesheet would be small after purging.
* Bad, because it adds an integration, a config file and a build step to a site
  with four pages.
* Bad, because markup becomes dense with utility classes, which is a real
  readability cost when the same person is writing the content and the layout.

### UI framework island plus component library

* Good, because a component library would supply accessible, pre-styled
  primitives.
* Bad, because it ships a JavaScript runtime to the browser for pages that have
  no behaviour, directly contradicting the reason Astro was chosen.
* Bad, because it would require loosening `script-src` in the CSP.
* Bad, because it is a large amount of machinery for a site whose most complex
  interaction is a hover state.

## More Information

Applies to [`src/layouts/Layout.astro`](../../src/layouts/Layout.astro),
[`src/components/SiteNav.astro`](../../src/components/SiteNav.astro) and every
page under [`src/pages/`](../../src/pages/). The mobile-first requirement is
recorded in
[`mobile-first-design.md`](../../src/content/blog/mobile-first-design.md).

Revisit if the shared-token problem becomes expensive enough to be worth a build
step — a plain CSS custom-property layer in `Layout.astro` is the cheaper fix and
should be tried before Tailwind.

*[2026-09-04: the cheaper fix was tried and worked, so the case for Tailwind is
weaker now than when this was written, not stronger. See the note on that
consequence.]*
