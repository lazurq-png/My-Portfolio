---
status: "accepted"
date: "2026-08-11"
corrected: "2026-09-04"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0003. Host on Cloudflare Pages, built and deployed from Git

> **Corrected 2026-09-04.** As first written, this record described the
> deployment path as Cloudflare's Workers static-asset hosting driven by a manual
> `wrangler deploy`, and stated explicitly that it was *not* Cloudflare Pages.
> That was wrong, and wrong from the start rather than overtaken by a later
> change: commit `d0ec3fc` ("pnpm update to try to fix Cloudflare unable to
> deploy", 2026-08-11) touches only `package.json` and `pnpm-lock.yaml`, and a
> manual upload of a prebuilt `dist/` cannot fail on a lockfile — Cloudflare was
> already installing dependencies and building the site itself on the day this
> decision was recorded. The decision is unchanged; the description of it is
> corrected here, along with the consequences that followed from the error.

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
  [0014](0014-emit-security-headers-as-a-generated-headers-file.md) depends on
  them.

## Considered Options

* Cloudflare Pages
* Vercel
* Netlify
* GitHub Pages

## Decision Outcome

Chosen option: "Cloudflare Pages", as the project `my-portfolio-72x`, connected
to the `lazurq-png/My-Portfolio` repository through Cloudflare's GitHub
integration. Cloudflare is the only option that combines a genuinely unrestricted
free tier with the domain, TLS and edge protection in one place, and it keeps the
DNS and the origin under a single provider.

Deployment is **automatic and driven by Git**, not by a command run locally.
On a push, Cloudflare clones the repository at that commit and runs the build
itself in its own environment:

```
clone repo → pnpm install → pnpm run build → deploy dist/
```

The build image detects `pnpm@10.11.1, nodejs@22.16.0` from the environment, then
Corepack honours the `packageManager` field in `package.json` and fetches the
pinned pnpm (11.25.0) before installing. The user build command is
`pnpm run build`, and the asset output directory is `dist/`.

> *[2026-09-04: this record states three incompatible things about the build
> command, and a reader cannot currently tell whether the deploy gate exists.
> Here it is `pnpm run build`; the Consequences below say it "is therefore
> `pnpm run build:deploy`"; the More Information says it will "keep running plain
> `pnpm run build` and deploying unverified" until the dashboard field is
> changed. The setting lives in the Cloudflare dashboard, so nothing in this
> repository can settle it — `package.json` defines `build:deploy` either way.
> **Resolve it by reading the most recent build log**: the line
> `Executing user command: …` names the command actually run. Then correct this
> passage to match and delete the two that do not. Until then, treat the gate as
> unconfirmed rather than assuming either answer.]*

Branches map to two environments:

* A push to the **production branch** publishes production.
* A push to any other branch — `dev`, in practice — publishes a **preview**, at a
  per-commit URL plus a stable branch alias (`dev.my-portfolio-72x.pages.dev`).
  Cloudflare adds `x-robots-tag: noindex` to preview responses.

### Consequences

* Good, because it costs nothing at this scale, with TLS, CDN caching and DDoS
  protection applied without additional configuration.
* Good, because only static assets are served — there is no application runtime
  at the edge, so there is no server-side execution surface to secure.
* Good, because DNS, certificate and origin live with one provider, so there is
  no cross-vendor delegation to get wrong.
* Good, because releasing needs no local toolchain and cannot be forgotten: the
  deployed site never drifts behind the branch it tracks.
* Good, because every branch gets a preview URL, so a change can be looked at on
  real Cloudflare infrastructure before it reaches production.
* Neutral, because the deploy is gated on the tests by the build command rather
  than by CI. Cloudflare builds from its own clone and never sees a GitHub Actions
  result, so the only way to stop a bad deploy is to make the build itself fail.
  The dashboard build command is therefore `pnpm run build:deploy`, defined in
  `package.json` as:

  ```
  pnpm check && pnpm test:unit && pnpm build && pnpm test:build
  ```

  Keeping the chain in `package.json` rather than in the dashboard field means the
  gate is versioned and reviewable, and the dashboard holds only a pointer to it.
  It adds roughly 10 seconds to a build that took 16.
* Bad, because that gate does not cover Playwright. `@playwright/test` is
  installed on the build image but the browsers are not, so
  [0009](0009-use-playwright-for-e2e-tests.md)'s suite runs only in
  [`ci-pull.yml`](../../.github/workflows/ci-pull.yml). A change that breaks only
  in a browser can still reach production if it is merged without the e2e job
  having run.
* Bad, because the gate duplicates work CI already does. Every push runs the unit
  suite twice — once in Actions, once on Cloudflare — and the two can disagree,
  since they run different Node versions (see below).
* **Bad, because `wrangler.jsonc` is dead configuration that looks live.** The
  build log reports it twice:

  > *Found wrangler.json file. Reading build configuration… A Wrangler
  > configuration file was found but it does not appear to be valid. Did you mean
  > to use wrangler.toml to configure Pages? If so, then make sure the file is
  > valid and contains the `pages_build_output_dir` property. Skipping file and
  > continuing.*

  Pages wants `pages_build_output_dir`; the file instead carries an `assets`
  block, which is Workers syntax. So neither `assets.directory` nor
  `compatibility_date` has any effect on what ships — including the
  `// Update to the day you deploy` comment, which asks for maintenance that
  changes nothing. The real output directory lives in the dashboard build
  settings.
* Bad, because `wrangler` is still a devDependency and is installed on every
  Cloudflare build (pulling `workerd`'s postinstall with it) despite taking no
  part in deployment.
* Bad, because the build environment runs **Node 22.16.0** while CI runs Node 24.
  The bundle that reaches production is therefore built on a version no test job
  ever exercises. It does at least mean `engines.node >= 22.12.0` is honoured
  somewhere, which [0011](0011-run-ci-on-github-actions.md) noted was otherwise
  only a claim.
* Neutral, because the response headers are delivered as a `_headers` file
  generated into `dist/`
  ([0014](0014-emit-security-headers-as-a-generated-headers-file.md)). Pages
  parses that file — the build log confirms `Parsed 1 valid header rule` — so the
  policy does reach the edge, but by a mechanism separate from the build config
  and worth verifying rather than assuming.

### Confirmation

**Verified 2026-09-04** against the preview deployment of commit `a1cf5f1`
(`https://4f90a7c6.my-portfolio-72x.pages.dev`): `curl -I` returned all five
headers from `SECURITY_HEADERS` in [`src/lib/headers.ts`](../../src/lib/headers.ts),
matching the constant exactly, CSP included. This satisfies the Confirmation in
[0014](0014-emit-security-headers-as-a-generated-headers-file.md).

What to check, and where:

* The build settings that actually control deployment are in the Cloudflare
  dashboard — Workers & Pages → `my-portfolio-72x` → Settings → Build. **Not** in
  `wrangler.jsonc`, which is skipped. Changing Astro's `outDir` without changing
  the dashboard's output directory silently deploys nothing.
* After a deploy, confirm with `curl -I` against the live URL that the headers are
  present on responses. Do this against production, not only a preview: they are
  separate deployments.
* `Parsed N valid header rule` in the deploy log is the earlier signal that
  `dist/_headers` was picked up.

## Pros and Cons of the Options

### Cloudflare Pages

* Good, because the free tier has no traffic ceiling that this site will reach
  and no restriction on commercial or professional use.
* Good, because edge security — DDoS mitigation, bot filtering — is on by
  default rather than being a paid add-on.
* Good, because it supports `_headers`, which is what makes
  [0014](0014-emit-security-headers-as-a-generated-headers-file.md) possible.
* Good, because push-to-deploy and per-branch previews come with the Git
  integration rather than having to be built.
* Neutral, because the build configuration lives in a dashboard rather than in the
  repository. What it *does* is kept in `package.json` as `build:deploy`, so the
  reviewable part is versioned; the dashboard holds one line pointing at it. The
  output directory and Node version are still dashboard-only, and this record is
  the only place they are written down.

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
  make [0014](0014-emit-security-headers-as-a-generated-headers-file.md)
  impossible to implement. This is disqualifying on its own.
* Bad, because there is no WAF or configurable edge protection.

## More Information

This record supersedes the original untracked `docs/adr/cloudflare.md`, which
named the decision but documented no alternatives, no consequences and no status.

Context from commits `d7b2dfe` (Wrangler added) and `d0ec3fc` (a pnpm update made
to resolve a failing Cloudflare deploy) on 2026-08-11. The latter is the evidence
that Cloudflare was building from Git from the beginning — see the correction note
at the top.

The filename still says `with-wrangler`, which the correction makes inaccurate. It
is kept so the links from
[0001](0001-use-astro-as-site-framework.md),
[0006](0006-set-security-headers-in-build-config.md),
[0011](0011-run-ci-on-github-actions.md) and
[0014](0014-emit-security-headers-as-a-generated-headers-file.md) keep resolving.

**The build command must be set in the dashboard for the gate to exist.** The
`build:deploy` script is inert on its own: Cloudflare runs whatever the Build
settings say, and until that field reads `pnpm run build:deploy` it will keep
running plain `pnpm run build` and deploying unverified. Confirm by looking for
`Executing user command: pnpm run build:deploy` in the next build log.

Two follow-ups remain:

1. Delete `wrangler.jsonc` and drop the `wrangler` devDependency, or convert the
   file to a valid Pages config with `pages_build_output_dir`. Leaving it as-is
   keeps a warning in every build log and a file that reads as authoritative but
   is ignored.
2. Align the Node versions, so that what CI tests is what Cloudflare builds. A
   `.node-version` file in the repository is honoured by the Pages build image, so
   this one need not be a dashboard change.
