---
status: "accepted"
date: "2026-10-28"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0019. Self-host fonts with Astro's Fonts API

## Context and Problem Statement

`Layout.astro` loaded Inter and IBM Plex Mono from Google Fonts: a `<link rel="stylesheet">` to
`fonts.googleapis.com`, two `preconnect` hints, and font files from `fonts.gstatic.com`. That has three
costs. The stylesheet is render-blocking and third-party. Every visitor's browser makes a request to
Google, which is a privacy and GDPR consideration for a personal site. And the CSP needed two named
exceptions for it, `style-src https://fonts.googleapis.com` and `font-src https://fonts.gstatic.com`
([0014](0014-emit-security-headers-as-a-generated-headers-file.md)), the last external origins left after
[0018](0018-self-host-project-preview-images.md).

Astro's built-in Fonts API (`fonts` in `astro.config.mjs` with `fontProviders.google()`, and the
`<Font />` component) fetches the files at build time and serves them from the site. Should the site use it?

## Decision Drivers

* No visitor request should leave the site for something the site could ship itself.
* The CSP is meant to be a strict allowlist; every named origin is a standing exception.
* No dependency or UI framework should be added for it
  ([0005](0005-no-ui-framework-scoped-styles-only.md)).
* The build is the production deploy gate ([0016](0016-load-projects-from-github-at-build-time.md)), so
  anything the build newly fetches must not be a new way for it to fail.

## Considered Options

* Keep the Google Fonts `<link>`
* Self-host with Astro's Fonts API
* Self-host by committing font files and writing `@font-face` by hand

## Decision Outcome

Chosen option: "self-host with Astro's Fonts API". Inter (400-700) and IBM Plex Mono (400-600) are declared
in `astro.config.mjs`; `Layout.astro` renders `<Font cssVariable="--font-inter" preload />` and
`<Font cssVariable="--font-plex-mono" />`, and the `--font-sans` / `--font-mono` tokens build on the
variables the API defines. Astro generates the `@font-face` rules and size-adjusted fallback fonts, so the
swap from fallback to web font shifts the layout less.

The CSP no longer names any external origin: `style-src 'self' 'unsafe-inline'`, `font-src 'self'`,
`img-src 'self'`, `script-src 'self'`. `build/headers.test.ts` now rejects any `http:` or `https:` source in
the policy, so a future exception has to be a deliberate change to that test, and an ADR.

Hand-writing `@font-face` was rejected: it commits binaries and reimplements what the API generates,
including the fallback metrics.

### Consequences

* Good, because no visitor request goes to Google, and the render-blocking third-party stylesheet is gone.
* Good, because the CSP is `'self'` throughout, and a test says so.
* Good, because the primary font is preloaded and the fallbacks are metric-adjusted.
* Bad, because the build now downloads the font files from Google. They are cached after the first run,
  but a first build with no network cannot fetch them. Unlike the GitHub loader this is not fail-soft, so
  a Google Fonts outage during a deploy would fail that deploy. Accepted: Google Fonts is a CDN with far
  weaker rate limits than the GitHub API, and the failure is loud rather than a silent blank.
* Bad, because only the weights and subsets declared in `astro.config.mjs` exist. Using `font-weight: 300`
  somewhere needs the config changed first, or the browser synthesises it.
