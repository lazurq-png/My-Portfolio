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
- **Blog routing**: `src/pages/blog/index.astro` lists posts (sorted by `pubDate` desc) and links to them via `sanitizeSlug()` from `src/lib/sanitize.ts`. `src/pages/blog/[...slug].astro` independently re-implements the same slug-sanitization logic inline inside `getStaticPaths()` rather than importing `sanitizeSlug` — keep both in sync if slug rules change.
- **Layout is not prop-driven**: `src/layouts/Layout.astro` hardcodes its `<title>`/meta description and does not declare any props. `[...slug].astro` passes `title`, `description`, `canonicalPath`, and `ogType` into `<Layout>` but these are silently ignored — per-page/per-post SEO metadata does not currently work despite call sites assuming it does.
- **Nav is opt-in per page**: `SiteNav.astro` is not part of `Layout.astro` — every page imports and renders `<SiteNav />` itself.
- **Security headers**: `astro.config.mjs` sets a strict CSP plus HSTS/X-Frame-Options/etc. at build config level. The CSP allowlists only `https://cdn.astro.build` for scripts and Google Fonts domains for styles/fonts — adding any new external resource (script, font, API) requires updating this CSP or it will be blocked at runtime.
- **CI**: `.github/workflows/ci-push.yml` runs unit tests on push to `dev`; `.github/workflows/ci-pull.yml` runs unit tests + Playwright e2e (chromium/firefox/webkit/mobile) on PRs into `master`.
