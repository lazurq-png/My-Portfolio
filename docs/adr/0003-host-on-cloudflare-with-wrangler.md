---
status: "accepted"
date: "2026-08-11"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0003. Host on Cloudflare, deploy with Wrangler

## Context and Problem Statement

The build produces a directory of static files (`dist/`) with no server-side
component — see [0001](0001-use-astro-as-site-framework.md). For the portfolio to
be reachable by anyone else, that directory needs a public origin, a TLS
certificate, and a domain name pointed at it. Which hosting provider serves the
site, and how do builds get there?

## Decision Drivers

* Free at this traffic level, and free in a way that permits a portfolio used to
  find work.
* TLS and domain management included, not assembled from separate services.
* No server to patch or maintain, since the output is static assets.
* A baseline security posture — DDoS absorption and edge filtering — without
  configuring anything.
* Custom response headers must be deliverable, because
  [0006](0006-set-security-headers-in-build-config.md) depends on them.

## Considered Options

* Cloudflare, deployed with Wrangler
* Vercel
* Netlify
* GitHub Pages

## Decision Outcome

Chosen option: "Cloudflare, deployed with Wrangler". `wrangler.jsonc` points
`assets.directory` at `./dist`, so the built output is uploaded as a static asset
bundle. Cloudflare is the only option that combines a genuinely unrestricted free
tier with the domain, TLS and edge protection in one place, and it keeps the DNS
and the origin under a single provider.

Note for precision: this is Cloudflare's static-asset hosting configured through
`wrangler.jsonc` with a `compatibility_date`, not Cloudflare Pages. The two are
often conflated; the deployment path here is Wrangler.

### Consequences

* Good, because it costs nothing at this scale, with TLS, CDN caching and DDoS
  protection applied without additional configuration.
* Good, because only static assets are served — there is no application runtime
  at the edge, so there is no server-side execution surface to secure.
* Good, because DNS, certificate and origin live with one provider, so there is
  no cross-vendor delegation to get wrong.
* Bad, because `compatibility_date` in `wrangler.jsonc` is pinned to `2026-08-11`
  and carries a comment instructing the author to bump it on deploy. That is a
  manual step with no reminder attached, so it will silently drift.
* Bad, because the response headers declared in `astro.config.mjs` are a build-
  level concern and are not automatically carried into the deployed origin's
  responses. Header delivery has to be verified against the live site, not
  assumed from the build — see the Confirmation in
  [0006](0006-set-security-headers-in-build-config.md).
* Bad, because Wrangler is a devDependency invoked manually. There is no
  git-push-to-deploy hook and no deploy job in CI
  ([0011](0011-run-ci-on-github-actions.md)), so releasing depends on a local
  toolchain being present and working.
* Neutral, because there are no per-PR preview deployments. For a solo project
  the local dev server and the Playwright suite cover that need.

### Confirmation

`wrangler.jsonc` `assets.directory` must remain `./dist`, matching Astro's
default output directory; a change to either without the other silently deploys
nothing. After a deploy, confirm with `curl -I` against the live URL that the
headers from [0006](0006-set-security-headers-in-build-config.md) are actually
present on responses.

## Pros and Cons of the Options

### Cloudflare with Wrangler

* Good, because the free tier has no traffic ceiling that this site will reach
  and no restriction on commercial or professional use.
* Good, because edge security — DDoS mitigation, bot filtering — is on by
  default rather than being a paid add-on.
* Neutral, because Wrangler is another tool to learn and keep updated, but it is
  a single devDependency.
* Bad, because deployment is a manual command, so nothing prevents the deployed
  site from drifting behind `master`.

### Vercel

* Good, because it has the best Astro developer experience of the four, with
  zero-configuration builds and a preview deployment per pull request.
* Good, because the hobby tier is free.
* Bad, because the free tier restricts commercial use, and a portfolio used to
  attract work sits uncomfortably close to that line.
* Bad, because it would mean a second vendor alongside Cloudflare for DNS, and
  two dashboards to reason about when something breaks.

### Netlify

* Good, because it offers per-PR previews and a mature static-hosting story with
  first-class custom header support via a `_headers` file.
* Neutral, because its feature set here is broadly equivalent to Vercel's.
* Bad, because free-tier build minutes are metered, and the Playwright-heavy
  workflow would push toward that limit if builds ever moved there.
* Bad, because it, too, splits DNS from the origin.

### GitHub Pages

* Good, because it is free, unmetered for this use, and the repository is
  already on GitHub.
* Bad, because it does not support custom response headers at all, which would
  make [0006](0006-set-security-headers-in-build-config.md) impossible to
  implement. This is disqualifying on its own.
* Bad, because there is no WAF or configurable edge protection.

## More Information

This record supersedes the original untracked `docs/adr/cloudflare.md`, which
named the decision but documented no alternatives, no consequences and no status.
The decision itself is unchanged; the analysis around it is new.

Context from commits `d7b2dfe` (Wrangler added) and `d0ec3fc` (a pnpm update made
to resolve a failing Cloudflare deploy) on 2026-08-11.

Revisit if deployment moves into CI, or if the site ever needs server-side
rendering — the latter would invalidate the "static assets only" premise here.
