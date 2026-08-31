# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml` / `pnpm-lock.yaml`) — use `pnpm`, not `npm`/`yarn`.

```
pnpm install                # install dependencies
pnpm dev                     # astro dev, http://localhost:4321
pnpm build                    # astro build -> dist/
pnpm preview                   # preview the production build
pnpm test:unit                  # vitest run --coverage (src/__tests__/unitTests only)
pnpm test:e2e                    # playwright test (src/__tests__/e2e, auto-starts dev server)
```

Run a single unit test: `pnpm exec vitest run src/__tests__/unitTests/sanitize.test.ts`
Run a single e2e spec: `pnpm exec playwright test src/__tests__/e2e/blog.spec.ts`

Vitest is scoped to `src/__tests__` and explicitly excludes `e2e/`; Playwright is scoped to `src/__tests__/e2e` only — the two suites never overlap.

## Architecture

Static Astro portfolio site with no UI framework installed — pages are plain `.astro` components with scoped `<style>` blocks, deployed to **Cloudflare** as a static asset bundle (`wrangler.jsonc` points at `./dist`; see `docs/adr/cloudflare.md` for why Cloudflare was chosen over Vercel).

- **Content collection**: `src/content.config.ts` defines the `blog` collection (Zod schema: `title`, `description`, `pubDate`, optional `updatedDate`/`heroImage`), loaded from `src/content/blog/*.md`.
- **Blog routing**: `src/pages/blog/index.astro` lists posts (sorted by `pubDate` desc); `src/pages/blog/[...slug].astro` generates the post pages. Both derive URLs from `sanitizeSlug()` in `src/lib/sanitize.ts` — that function is the single source of truth for slug rules.
- **Layout props**: `src/layouts/Layout.astro` takes optional `title`, `description`, `canonicalPath`, and `ogType`, falling back to the site-wide title/description (and `Astro.url.pathname`/`"website"`) when omitted. It renders `<title>`, the meta description, `<link rel="canonical">`, and the Open Graph/Twitter tags from them. Only `[...slug].astro` passes props today; the other pages intentionally use the defaults. `astro.config.mjs` sets no `site`, so canonical/`og:url` are emitted root-relative — set `site` to the deployed domain to make them absolute.
- **Nav is opt-in per page**: `SiteNav.astro` is not part of `Layout.astro` — every page imports and renders `<SiteNav />` itself.
- **Security headers**: `astro.config.mjs` sets a strict CSP plus HSTS/X-Frame-Options/etc. at build config level. The CSP allowlists only `https://cdn.astro.build` for scripts and Google Fonts domains for styles/fonts — adding any new external resource (script, font, API) requires updating this CSP or it will be blocked at runtime.
- **CI**: `.github/workflows/ci-push.yml` runs unit tests on push to `dev`. `.github/workflows/ci-pull.yml` runs unit tests, a build, and Playwright e2e on PRs into `master`. The e2e job is a matrix with **one leg per spec file**, and legs are selected by `dorny/paths-filter` against `.github/e2e-filters.yml` — so a PR only runs the specs whose pages it touched. Because the specs navigate across page boundaries (e.g. `index.spec.ts` asserts against `/projects`), each filter lists every page its spec touches, not just the primary one; edit that file whenever a spec gains a new navigation. E2E runs in the `mcr.microsoft.com/playwright` container, whose tag must track the `@playwright/test` version in `pnpm-lock.yaml`. `e2e-gate` (not `e2e-tests`) is the job to mark as a required check — a skipped matrix never reports a status.
- **E2E serves `dist/`**: in CI, `playwright.config.ts` points `webServer` at `pnpm preview` and the build is downloaded as an artifact, so e2e exercises the same bundle deployed to Cloudflare. Locally it still uses `pnpm dev`. Viewport coverage belongs to the Playwright *projects* (`Mobile Chrome` keeps `isMobile`/`hasTouch`, which is what catches a broken `<meta name="viewport">`) — don't reintroduce `setViewportSize` calls inside specs, they override the project viewport and duplicate work.
