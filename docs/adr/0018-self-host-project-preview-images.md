---
status: "accepted"
date: "2026-10-28"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0018. Self-host the project preview images instead of hot-linking GitHub's

## Context and Problem Statement

[0017](0017-preview-projects-in-a-native-dialog.md) let a project fall back to
GitHub's generated Open Graph card, loaded by the visitor's browser from
`opengraph.githubassets.com` when the dialog or card was first shown. That host
rate-limits per IP and answers `429 Too Many Requests` once an address has used
its allowance (observed: 100 requests, then a 900-second `Retry-After`). Every
card and dialog is a request, so a few reloads — or a visitor on a shared
address — left broken-image icons in the cards and the dialog, with nothing the
page could do about it.

Should the pictures keep coming from GitHub at view time, or from the site?

## Decision Drivers

* A failed image must never be visible to a visitor. A missing one is a layout
  gap; a broken one is a defect.
* `pnpm build:deploy` is the production deploy gate
  ([0016](0016-load-projects-from-github-at-build-time.md)), and Cloudflare's
  build IPs are a shared pool, so the build must not newly depend on a
  rate-limited host either.
* The site CSP is meant to be a strict allowlist
  ([0014](0014-emit-security-headers-as-a-generated-headers-file.md)); an
  external `img-src` origin is a standing exception.
* The mechanism for local images already existed: `src/assets/projects/<repo>.png`
  through `astro:assets`, used by two projects.

## Considered Options

* Keep hot-linking, and hide the image when it fails
* Download each social card during the build and serve it from the site
* Commit the images to `src/assets/projects/` and serve only those

## Decision Outcome

Chosen option: "commit the images to `src/assets/projects/`". The social cards of
the two projects that had none were downloaded once and committed next to the
existing ones, and the portfolio's own entry uses a screenshot of the home page
rather than a card of its own repository. `ProjectImage.astro` no longer has a
remote branch, `socialImageUrl` is gone, and `img-src` is `'self'`.

Downloading during the build was the first choice and was rejected on closer
look: it would move the same rate-limited request from the visitor to the build,
where a `429` is not a broken icon but a missing image frozen into that deploy
until the next one, and where the failure is invisible unless the build log is
read. Committing the files makes the build deterministic and offline.

A curated project with no file now renders an empty reserved panel instead of a
broken image, and `src/__tests__/integration/projectAssets.test.ts` fails if a
`PROJECT_PICKS` entry has no matching file.

### Consequences

* Good, because no visitor request leaves the site for a picture, so there is no
  rate limit to hit and no broken image.
* Good, because `img-src` shrinks from a named external origin to `'self'`.
* Good, because the images ship as optimised WebP from `astro:assets`.
* Bad, because the images are snapshots. GitHub's cards embed live counts
  (contributors, issues, stars, forks), and the committed copies show them as
  they were on the day they were saved. A screenshot or an edited image avoids
  that; refreshing a card means downloading it again:
  `curl -o src/assets/projects/<repo>.png https://opengraph.githubassets.com/1/<owner>/<repo>`
* Bad, because adding a project now includes adding a picture, enforced by the
  test above rather than by convention.
* Bad, because binaries in git grow the repository by a few tens of KB each.
