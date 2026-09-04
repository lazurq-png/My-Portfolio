# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml` / `pnpm-lock.yaml`) — use `pnpm`, not `npm`/`yarn`.

```
pnpm install                # install dependencies
pnpm dev                     # astro dev, http://localhost:4321
pnpm build                    # astro build -> dist/
pnpm preview                   # preview the production build
pnpm test:unit                  # vitest run --coverage (unitTests/ + integration/)
pnpm test:build                  # vitest against dist/ — REQUIRES pnpm build first
pnpm test:e2e                     # playwright test (src/__tests__/e2e, auto-starts dev server)
pnpm check                         # astro check — type-checks .ts AND .astro templates
pnpm build:deploy                   # check + test:unit + build + test:build — what Cloudflare runs
```

Run a single unit test: `pnpm exec vitest run src/__tests__/unitTests/sanitize.test.ts`
Run a single e2e spec: `pnpm exec playwright test src/__tests__/e2e/blog.spec.ts`

**Four test scopes, one runner and one command each** (ADR 0010 + 0015) — the directory decides:

| Directory | Contains | Command |
|---|---|---|
| `unitTests/` | Pure functions | `pnpm test:unit` |
| `integration/` | Module seams, `.astro` renders via the Container API | `pnpm test:unit` |
| `build/` | Assertions about `dist/` | `pnpm test:build` |
| `e2e/` | Playwright | `pnpm test:e2e` |

`vitest.config.ts` is built from `getViteConfig` (`astro/config`), **not** Vitest's own `defineConfig` — that is what makes `.astro` imports and the `astro:content` virtual module resolve. It costs ~3s of startup; don't "optimise" it back. Its `exclude` spreads `configDefaults.exclude` because Vitest's `exclude` *replaces* rather than extends. `build/` has its own `vitest.build.config.ts` because its tests need a build to have run, which the push job never does.

`pnpm check` enforces `tsconfig.json`'s `strict` setting (ADR 0012). It runs as the `check` job on PRs into `master` — **not** on pushes to `dev`, which stay fast — and it gates the e2e matrix, so a type error doesn't burn four browsers. It covers `.astro` templates, not just `.ts`, which is what catches a bad `<Layout>` prop or an unguarded optional frontmatter field.

**`typescript` is pinned to `^6.0.3` on purpose.** TypeScript 7 is the native compiler and does not expose the programmatic API `astro check` is built on, so `pnpm check` dies with a "does not expose the programmatic API" error against it. Since 7.x is the `latest` tag, a bare `pnpm add -D typescript` silently reinstates the break and pnpm only *warns* about the peer violation. Don't bump it until [withastro/roadmap#1321](https://github.com/withastro/roadmap/discussions/1321) lands.

Because `tsconfig.json` uses `include: ["**/*"]`, every gitignored build artefact must be listed in its `exclude` or `astro check` reports diagnostics on generated code — `coverage`, `test-results`, `playwright-report` and `blob-report` are excluded alongside `dist` for that reason. Add to that list if a tool starts writing somewhere new.

## Architecture

Static Astro portfolio site with no UI framework installed — pages are plain `.astro` components with scoped `<style>` blocks, deployed to **Cloudflare Pages** (see `docs/adr/0003-host-on-cloudflare-with-wrangler.md` for why Cloudflare was chosen over Vercel).

- **Content collection**: `src/content.config.ts` defines the `blog` collection (Zod schema: `title`, `description`, `pubDate`, optional `updatedDate`/`heroImage`), loaded from `src/content/blog/*.md`.
- **Blog routing**: `src/pages/blog/index.astro` lists posts (sorted by `pubDate` desc); `src/pages/blog/[...slug].astro` generates the post pages. Both derive URLs from `sanitizeSlug()` in `src/lib/sanitize.ts` — that function is the single source of truth for slug rules. Note `post.id` is **already** github-slugged by Astro's glob loader (lowercased, path-separated), so `sanitizeSlug` is a second pass over an id that is mostly safe already. It is not injective: `de_mo.md` and `demo.md` both yield `demo`, and Astro resolves the clash with a **`[WARN]` on an exit-zero build**, silently dropping one post. `src/__tests__/build/routes.test.ts` is the guard — it compares pages built against posts on disk.
- **Layout props**: `src/layouts/Layout.astro` takes optional `title`, `description`, `canonicalPath`, and `ogType`, falling back to the site-wide title/description (and `Astro.url.pathname`/`"website"`) when omitted. It renders `<title>`, the meta description, `<link rel="canonical">`, and the Open Graph/Twitter tags from them. Only `[...slug].astro` passes props today; the other pages intentionally use the defaults. `astro.config.mjs` sets no `site`, so canonical/`og:url` are emitted root-relative — set `site` to the deployed domain to make them absolute.
- **Nav is opt-in per page**: `SiteNav.astro` is not part of `Layout.astro` — every page imports and renders `<SiteNav />` itself.
- **Design tokens live in `Layout.astro`**: the `<style is:global>` block there owns the colour, type, spacing, radius and `--measure` (line length) tokens plus the `.app-shell` / `.page-shell` / `.post-card` primitives. Pages compose those and add only page-specific rules — don't hard-code a colour or a one-off `font-size` in a page, or the pages drift apart again. The horizontal gutter is applied **once**, on `.app-shell`, which is what keeps the nav rail and the content column aligned identically on every page.
- **Responsive nav**: mobile-first. Below `48rem` `SiteNav` is a sticky top bar whose links, theme toggle and social icons collapse behind a hamburger; at `48rem` and up the same markup becomes the sticky left rail and the toggle is hidden. State is a `data-open` attribute on `#site-header`, driven by `public/nav.js` — in `public/` for the same reason as `theme-init.js`, so it stays a real same-origin file under `script-src 'self'`. A `<noscript>` block reveals the panel when JS is off. Because the layout is decided by a media query in an *external* stylesheet, e2e specs must `await navReady(page)` (or `openNav(page)`) from `src/__tests__/e2e/helpers/nav.ts` before probing which nav is showing — `domcontentloaded` does not wait for stylesheets.
- **Markdown styling needs `is:global`**: `<Content />` output does not receive the component's scope hash, so the `.article-prose` descendant rules in `[...slug].astro` live in a second, global `<style>` block. Posts are authored a line per thought, so `white-space: pre-line` is applied to `.article-prose :is(p, li)` — never to the wrapper, where it also renders the newlines *between* generated elements.
- **Security headers**: the policy is a typed constant in `src/lib/headers.ts`. A `security-headers` integration in `astro.config.mjs` renders it into `dist/_headers` on `astro:build:done`, which is what Cloudflare reads. There is **no top-level `headers` config option in Astro** — the array that used to sit in `astro.config.mjs` was silently discarded by the config schema and no header ever shipped (ADR 0014); don't reintroduce it. The CSP allowlists only `https://cdn.astro.build` for scripts and Google Fonts domains for styles/fonts — adding any new external resource (script, font, API) requires updating `SECURITY_HEADERS` or it will be blocked at runtime. `src/__tests__/build/headers.test.ts` asserts the constant against the emitted file in both directions. Deliberately **not** wired into `server.headers`: `script-src 'self'` blocks the dev server's inline HMR bootstrap.
- **CI**: `.github/workflows/ci-push.yml` runs unit + integration tests on push to `dev`. `.github/workflows/ci-pull.yml` runs unit + integration tests, `pnpm check`, a build followed by `pnpm test:build` in the same job (the only place a `dist/` exists), and Playwright e2e on PRs into `master`. The e2e job is a matrix with **one leg per spec file**, and legs are selected by `dorny/paths-filter` against `.github/e2e-filters.yml` — so a PR only runs the specs whose pages it touched. Because the specs navigate across page boundaries (e.g. `index.spec.ts` asserts against `/projects`), each filter lists every page its spec touches, not just the primary one; edit that file whenever a spec gains a new navigation. E2E runs in the `mcr.microsoft.com/playwright` container, whose tag must track the `@playwright/test` version in `pnpm-lock.yaml`. `e2e-gate` (not `e2e-tests`) is the job to mark as a required check — a skipped matrix never reports a status; `check` should be required alongside it. No setup step passes a `version` to `pnpm/action-setup` — the pnpm version comes from `packageManager` in `package.json`, and supplying both fails the step when they disagree.
- **Deploys are automatic, and gated by the build command — not by CI**: Cloudflare Pages (project `my-portfolio-72x`) is connected to the GitHub repo and builds on every push — it clones, runs `pnpm install`, then the dashboard's build command, and publishes `dist/`. Nothing in `.github/workflows/` deploys anything, and Cloudflare never sees a GitHub Actions result. A push to `dev` publishes a **preview** (`dev.my-portfolio-72x.pages.dev`); the production branch publishes production. The only way to stop a bad deploy is to fail the build, so the build command is `pnpm run build:deploy` (`check` → `test:unit` → `build` → `test:build`). **That means `package.json`'s `build:deploy` is production deploy configuration** — breaking it silently disables the gate. Playwright is *not* in it (browsers aren't on the build image), so e2e gates the merge into `master` but never a deploy. Two traps: **`wrangler.jsonc` is ignored** (Pages wants `pages_build_output_dir`, the file has a Workers `assets` block — the build log warns and skips it, so `assets.directory` and `compatibility_date` do nothing; the real build settings are in the Cloudflare dashboard), and Cloudflare builds on **Node 22.16.0** while CI runs Node 24, so the unit suite runs twice on two versions. See ADR 0003.
- **E2E serves `dist/`**: in CI, `playwright.config.ts` points `webServer` at `pnpm preview` and the build is downloaded as an artifact, so e2e exercises the same bundle deployed to Cloudflare. Locally it still uses `pnpm dev`. Viewport coverage belongs to the Playwright *projects* (`Mobile Chrome` keeps `isMobile`/`hasTouch`, which is what catches a broken `<meta name="viewport">`) — don't reintroduce `setViewportSize` calls inside specs, they override the project viewport and duplicate work.
