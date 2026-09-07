---
status: "accepted"
date: "2026-09-07"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0017. Preview a project in a pre-rendered native `<dialog>`

## Context and Problem Statement

Every card on `/projects` was a whole-card `<a target="_blank">` to GitHub, so
the only thing a visitor could do with the projects page was leave it. The wanted
behaviour was a preview: click a card, see what the repository is, decide whether
to go.

The obvious implementation — embed the GitHub page — is not available. github.com
serves `X-Frame-Options: deny`, and the site's own CSP has no `frame-src`, so
`default-src 'self'` blocks a frame regardless
([0014](0014-emit-security-headers-as-a-generated-headers-file.md)). Fetching the
data live is blocked by the same policy's `connect-src 'self'`. So: what is a
preview, given that nothing about it can be loaded at the moment of the click,
and given that the site ships no UI framework
([0005](0005-no-ui-framework-scoped-styles-only.md))?

## Decision Drivers

* No framework, and no wish to add one for a modal.
* `script-src 'self'` — an inline script needs a hash, which is why
  `public/nav.js` and `public/theme-init.js` are real files.
* A modal is an accessibility problem: focus trapping, Escape, returning focus,
  making the page behind it inert. Hand-rolled ones usually get some of that
  wrong.
* The page must still work with JavaScript off. It did before — every card was a
  plain link.

## Considered Options

* A pre-rendered native `<dialog>` per project, opened by a small script
* A hand-built modal: a hidden `<div>`, a focus trap, an Escape handler
* An `<iframe>` of the repository page
* A dedicated `/projects/[slug]` route instead of a modal

## Decision Outcome

Chosen option: "a pre-rendered native `<dialog>` per project". `ProjectPreview.astro`
renders one `<dialog>` for each entry in the `projects` collection, filled at
build time from data [0016](0016-load-projects-from-github-at-build-time.md)
fetched. `public/projects.js` does two things: it reveals the Preview buttons and
it calls `showModal()`.

Everything else is the platform's. `showModal()` supplies the focus trap, the
Escape handler, the backdrop, inertness of the page behind the dialog, and
returning focus to the button that opened it. The Close button is a
`<form method="dialog">`, which closes the dialog with no JavaScript at all once
it is open. None of that is reimplemented, and the e2e spec asserts the parts of
it this site depends on — not to test the browser, but to catch a change here
that breaks them.

The card stopped being one big `<a>`: a link that does not navigate is a known
screen-reader trap. It is an `<article>` whose **title is a `<button>`**, and
that button's `::after` is stretched over the whole card — so the entire card
opens the preview while the control underneath is still a genuine button, with
Enter/Space, focus and the right role supplied by the platform rather than by a
click handler on a `<div>`.

**The card carries no link of its own.** The only route to a repository is the
"View on GitHub" link inside the dialog, which makes the preview a required stop
rather than an optional one. That is a deliberate product decision and it has a
real cost, recorded below.

The button ships `disabled` and `projects.js` enables it. `disabled` rather than
`hidden` because the button *is* the title: hiding it would hide the project's
name. The stretched hit area and the hover lift are both scoped to
`:not(:disabled)`, so with the script absent nothing on the card claims to be
clickable.

The one runtime request the preview makes is the repository's Open Graph card
from `opengraph.githubassets.com`, which the existing `img-src 'self' https:`
already permits. **No CSP change was needed for any of this**, which was a
requirement rather than a happy accident: a preview widget is not worth spending
a header on.

### Consequences

* Good, because the accessible behaviour is the browser's, and the script that
  could get it wrong is about twenty lines.
* Good, because it needed no dependency, no framework, and no change to
  `SECURITY_HEADERS`.
* Good, because there is no runtime request for the content: the dialog is in the
  HTML, so it opens instantly and works offline once the page has loaded.
* Bad, because every project's dialog is in the document whether or not anyone
  opens one. Two projects make that irrelevant; twenty would make the page heavy,
  and that is the point at which this decision should be revisited.
* Bad, because the preview is a build-time snapshot. A repo renamed or updated
  after the last deploy is misdescribed until the next one.
* Bad, because the social image starts loading only when the dialog first opens —
  a closed `<dialog>` is `display:none` — so the first open shows a blank frame
  for a moment. Mitigated with a reserved `aspect-ratio` box so nothing jumps,
  not solved.
* Bad, because a stretched overlay makes text inside the card awkward to select
  with a mouse — dragging across the summary drags across the hit area instead.
  That is the standing cost of any whole-card click target.
* **Bad, because with JavaScript off a project is now unreachable.** The card is
  inert by design and no longer carries a link, so those visitors get a list of
  names and nothing to click. Before this change the page degraded to plain links;
  it no longer degrades at all. The cheap mitigation, if it is ever wanted, is a
  `<noscript>` block rendering the link on the card — the same technique
  `SiteNav.astro` already uses to reveal its panel. Not done, because the whole
  point of the change was to take the link off the card.
* Neutral, because the card's accessible name is now just the project title.
  `aria-haspopup="dialog"` is what tells a screen reader the button opens a
  dialog rather than navigating.

### Confirmation

`src/__tests__/e2e/projects.spec.ts` opens a dialog, closes it three ways —
Escape, the Close button, a backdrop click — and asserts focus returns to the
button that opened it. `src/__tests__/integration/projects.test.ts` asserts every
opener's `data-preview` addresses a dialog id that exists; nothing in the type
system connects those two strings, so a slug change on one side only is the
failure most likely to ship silently.

An e2e test hit-tests the centre of a card and requires it to resolve to the
opener, which is what proves the stretched overlay actually covers the card.
Another asserts the card grid contains no `<a>` at all: a link reappearing there
would sit under that same overlay and be unclickable, so its absence is now an
invariant rather than an accident.

The no-JavaScript path is verified by hand, by turning JavaScript off: the cards
and their titles render and the openers stay disabled. There is nothing else to
check, because there is nothing else to click.

## Pros and Cons of the Options

### Native `<dialog>`

* Good, because the hard parts are already implemented and tested by the browser.
* Bad, because it commits to markup for every project up front.

### Hand-built modal

* Good, because it could render lazily, one dialog's worth of markup at a time.
* Bad, because it means writing a focus trap, an Escape handler, an inert
  background and focus restoration by hand — considerably more script than this
  site has anywhere else, to reproduce something the platform ships.

### `<iframe>` of the repository

* Good, because it would be a genuinely live preview.
* Bad, because it does not work: `X-Frame-Options: deny` at GitHub's end and no
  `frame-src` at ours. Not a trade-off, an impossibility.

### A `/projects/[slug]` route

* Good, because it needs no JavaScript at all and each project becomes linkable.
* Good, because it would scale past the point where inlining every dialog stops
  being reasonable.
* Bad, because it is a navigation, and the request was specifically to keep the
  visitor on the page.
* Worth revisiting if the project list grows.

## More Information

See [`src/components/ProjectPreview.astro`](../../src/components/ProjectPreview.astro),
[`public/projects.js`](../../public/projects.js) and
[0016](0016-load-projects-from-github-at-build-time.md), which supplies
everything the dialog shows.
