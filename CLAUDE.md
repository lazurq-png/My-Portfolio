# CLAUDE.md

Static Astro portfolio on Cloudflare Pages. Commands, test scopes, deploys and layout: [README.md](README.md).
Reasons: [docs/adr/](docs/adr/README.md). This file is only what is easy to get wrong.

Use **pnpm**. Work on `dev`; production is a PR into `master`. Task workflows: `.claude/skills/`.

## Gotchas

- `typescript` is pinned `^6.0.3`: TS 7 breaks `astro check`, and a bare `pnpm add -D typescript` reinstates it.
- `tsconfig.json` has `include: ["**/*"]`: add any new gitignored build dir to its `exclude`.
- `vitest.config.ts` uses `getViteConfig` (not `defineConfig`) so `.astro` and `astro:content` resolve. Leave it.
- Prettier ignores `*.md` on purpose: ADRs are immutable, posts are one line per thought. Never reformat them.
- Astro 7 detaches `astro dev` under an agent; set `ASTRO_DEV_BACKGROUND=1` to keep a server in the foreground.
- The `projects` loader fetches GitHub at build time and is fail-soft (`build:deploy` is the deploy gate).
  Keep `html_url` required in `GITHUB_REPO_SCHEMA` and `store.clear()` in `load`. Delete `.astro/` if a
  `src/lib/github.ts` edit seems to do nothing.
- Project cards have no `<a>`, and the dialog's focus, Escape and backdrop are the browser's: don't reimplement.
- Every page renders `<SiteNav />` itself (`Layout.astro` doesn't); a new page that forgets it has no nav.
- Scripts are real files in `public/` loaded via `src`: `script-src 'self'` silently blocks an inline `<script>`.
- Design tokens live in `Layout.astro`: no hard-coded colours or one-off `font-size` in pages.
- Markdown output needs a `<style is:global>` block (no scope hash); `pre-line` goes on `p`/`li`, never the wrapper.
- Security headers come from `src/lib/headers.ts`. Astro has no top-level `headers` option, so don't add one.
  A new external origin is blocked until it is allowed there (see the `add-external-resource` skill).
- e2e: `await navReady(page)` before probing the nav; no `setViewportSize` (projects own viewports).
  `a11y.spec.ts` runs axe on the rendered pages in both themes: a colour-token change must keep contrast.
  Add pages to `.github/e2e-filters.yml` when a spec gains a navigation. Keep the Playwright container tag
  in `ci-pull.yml` equal to `@playwright/test`.
- Cloudflare runs `pnpm run build:deploy` on every push, so that script **is** production config. The build
  settings live only in the Cloudflare dashboard. No Wrangler config, don't add one.
