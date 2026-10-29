# `docs/`: index for agents

The ADRs in `adr/` are the canonical record, written for agents. **Read this index
first. Open a full ADR only when the task touches its decision.** Humans read
[`overview.html`](overview.html) instead: a short plain-language page derived from
these files. Don't read it for facts.

If you change an ADR, update its row below **and** its card in `overview.html`, then
run `pnpm docs:stamp`. `pnpm docs:check` fails in CI while any ADR is newer than the
page (`overview.sources`). It is deliberately not part of `build:deploy`: a stale
page must never block a deploy. The stamp also copies every ADR into the page, whose
"Full record" links show them formatted. Never edit that generated block by hand.

## Decisions (`adr/`)

| ADR | Status | Decision | Constraint on your change | Enforced by |
|---|---|---|---|---|
| [0001](adr/0001-use-astro-as-site-framework.md) | accepted | Astro, static output | Pages are `.astro`, rendered at build time. No client runtime by default | nothing |
| [0002](adr/0002-author-content-as-markdown-content-collection.md) | accepted | Blog posts are Markdown in a typed content collection | Posts live in `src/content/blog/`; frontmatter must pass the Zod schema in `src/content.config.ts` (`pubDate` parsed by `src/lib/dates.ts`) | the build; `integration/content.test.ts`, `build/routes.test.ts` |
| [0003](adr/0003-host-on-cloudflare-pages.md) | accepted | Cloudflare Pages, deployed from Git; `pnpm run build:deploy` is the only deploy gate | `build:deploy` in `package.json` is production config. Build settings live only in the dashboard. Node.js comes from `.node-version` (no `NODE_VERSION` in the dashboard). No Wrangler config | Cloudflare runs it on every push |
| [0004](adr/0004-use-pnpm-as-package-manager.md) | accepted | pnpm; `allowBuilds` allowlists `esbuild` and `sharp` | Use pnpm only. A package needing a build script must be added to `allowBuilds` on purpose | `--frozen-lockfile` in CI |
| [0005](adr/0005-no-ui-framework-scoped-styles-only.md) | accepted | No UI framework; scoped `<style>` blocks plus tokens in `Layout.astro` | No React/Vue/Tailwind. Interactivity is small same-origin scripts in `public/` | CSP `script-src 'self'`; nothing counts dependencies |
| [0006](adr/0006-set-security-headers-in-build-config.md) | superseded by 0014 | Headers in `astro.config.mjs` | None: Astro has no `headers` option; this never shipped a header | n/a |
| [0007](adr/0007-centralise-sanitization-in-lib.md) | accepted | One `sanitizeSlug()` in `src/lib/sanitize.ts` | Every blog URL and dialog id comes from `sanitizeSlug()`. Never inline slug rules | `unitTests/sanitize.test.ts`, `build/routes.test.ts` |
| [0008](adr/0008-use-vitest-for-unit-tests.md) | accepted | Vitest, built on `getViteConfig` | Keep `vitest.config.ts` on `getViteConfig` so `.astro` and `astro:content` resolve | the integration tests stop resolving without it |
| [0009](adr/0009-use-playwright-for-e2e-tests.md) | accepted | Playwright: chromium, firefox, webkit, Mobile Chrome | Viewports belong to the projects (no `setViewportSize`). CI e2e runs against the built `dist/` | `ci-pull.yml` e2e matrix |
| [0010](adr/0010-separate-unit-and-e2e-test-scopes.md) | accepted (extended by 0015) | Test scopes are disjoint, decided by directory | A test's directory decides its runner | `vitest.config.ts` / `playwright.config.ts` |
| [0011](adr/0011-run-ci-on-github-actions.md) | accepted | GitHub Actions, split by trigger | Push to `dev`: lint, type check, unit. PR into `master`: everything. Required on `master`: Unit tests, Build, E2E tests (`e2e-gate`, never `e2e-tests`); keep static checks inside the Unit tests job so they stay required. Add pages to `.github/e2e-filters.yml` when a spec gains a navigation. Setup steps go in `.github/actions/setup`, not in a job | the workflows |
| [0012](adr/0012-use-typescript-strict-config.md) | accepted | `astro/tsconfigs/strict`; `astro check` covers `.astro` too | `typescript` stays on a release with the JavaScript compiler until Astro supports the native one. New build dirs go in `tsconfig.json`'s `exclude` | `pnpm check` (Unit tests job, both workflows; `build:deploy`) |
| [0013](adr/0013-render-icons-with-astro-icon.md) | accepted | `astro-icon` + `@iconify-json/devicon`, resolved at build time | Icons via `<Icon name="devicon:…" />`; local SVGs in `src/icons/`. No icon CDN | the CSP |
| [0014](adr/0014-emit-security-headers-as-a-generated-headers-file.md) | accepted | Policy in `src/lib/headers.ts`, written to `dist/_headers` at build | Change headers only there. Not wired into `server.headers` (breaks HMR) | `build/headers.test.ts` |
| [0015](adr/0015-add-an-integration-test-scope.md) | accepted | Four scopes: `unitTests/`, `integration/`, `build/`, `e2e/` | `build/` needs `pnpm build` first and has its own config | the four commands |
| [0016](adr/0016-load-projects-from-github-at-build-time.md) | accepted | Curated `PROJECT_PICKS` enriched from the GitHub API at build time, fail-soft | GitHub fields stay optional; `html_url` stays required; keep `store.clear()`. Optional `GITHUB_TOKEN` | `unitTests/github.test.ts`, `integration/projects.test.ts` |
| [0017](adr/0017-preview-projects-in-a-native-dialog.md) | accepted (amended by 0018) | Cards open a pre-rendered native `<dialog>`; the title is the `<button>` | No `<a>` in the grid; the `<noscript>` link list below it is the no-JavaScript route. Don't reimplement focus, Escape or backdrop. `data-preview` must match the dialog id | `integration/projects.test.ts`, `e2e/projects.spec.ts` |
| [0018](adr/0018-self-host-project-preview-images.md) | accepted | Preview images committed to `src/assets/projects/` | Every pick needs `<repo-name>.png`, exact case. Never hot-link GitHub's image host | `integration/projectAssets.test.ts`, CSP `img-src 'self'` |
| [0019](adr/0019-self-host-fonts-with-the-astro-fonts-api.md) | accepted | Inter + IBM Plex Mono via Astro's Fonts API, self-hosted | No external origin in the CSP; a new one needs that test changed and an ADR | `build/headers.test.ts` (rejects any `http(s):` source) |

## Conventions

- **One decision per file**, named `NNNN-kebab-case-title.md` and numbered in the
  order decisions were made. Numbers are never reused. Start from
  [`adr/0000-adr-template.md`](adr/0000-adr-template.md).
- **ADRs are kept correct, and they never block work.** An ADR that is wrong or out
  of date gets fixed in place. A real change of mind can still be a new ADR that
  supersedes the old one (`superseded by ADR-NNNN`). The one exception: during a
  night run (an unattended session), existing ADRs are not edited; the run reports
  what it found instead.
- **No versions.** An ADR records a decision and why, not which version of Node or a
  package was current. Current versions live in `package.json`, the workflows and
  the README.
- **State the downsides.** A Consequences section with only Good entries means the
  analysis was not done.
- Format is [MADR](https://adr.github.io/madr/), trimmed for a solo project.

## A note on dates

The first records were written retroactively on 2026-08-31 from the commit history
and the blog. Their `date:` is when the decision was made, not written, so a record
can cite a commit that postdates it. The retroactive ones are the least reliable;
0009 and 0011 carry notes where they were stale on arrival.
