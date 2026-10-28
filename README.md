# My Portfolio

Martin Larsson's portfolio and development blog: a static [Astro](https://astro.build) site with
no UI framework, hosted on Cloudflare Pages.

**Live:** <https://my-portfolio-72x.pages.dev> · **Preview (`dev` branch):**
<https://dev.my-portfolio-72x.pages.dev>

| Page | What it is |
|---|---|
| `/` | About me and the skills grid |
| `/projects` | Curated repositories, enriched with live GitHub data at build time; each card opens a preview dialog |
| `/blog` | Development notes, written as Markdown in `src/content/blog/` |

## Getting started

Prerequisites: **Node.js ≥ 22.12** and **pnpm** (the exact version is pinned in `package.json`'s
`packageManager`; `corepack enable` picks it up).

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build into `dist/` |
| `pnpm preview` | Serve the production build |
| `pnpm lint` | ESLint + Prettier check (`pnpm format` fixes what it can) |
| `pnpm check` | `astro check`: type-checks `.ts` **and** `.astro` templates |
| `pnpm test:unit` | Unit + integration tests with coverage (Vitest) |
| `pnpm test:build` | Assertions about `dist/`; **needs `pnpm build` first** |
| `pnpm test:e2e` | Playwright end-to-end tests (starts the dev server itself) |
| `pnpm build:deploy` | `lint` → `check` → `test:unit` → `build` → `test:build`: what Cloudflare runs |

Run one test: `pnpm exec vitest run src/__tests__/unitTests/sanitize.test.ts` or
`pnpm exec playwright test src/__tests__/e2e/blog.spec.ts`.

## Tests

The directory under `src/__tests__/` decides the scope, and each scope has one command
([ADR 0010](docs/adr/0010-separate-unit-and-e2e-test-scopes.md),
[0015](docs/adr/0015-add-an-integration-test-scope.md)):

| Directory | Contains | Command |
|---|---|---|
| `unitTests/` | Pure functions | `pnpm test:unit` |
| `integration/` | Module seams and `.astro` pages rendered through Astro's Container API | `pnpm test:unit` |
| `build/` | Assertions about the built `dist/` (security headers, routes) | `pnpm test:build` |
| `e2e/` | Playwright across Chromium, Firefox, WebKit and a mobile viewport | `pnpm test:e2e` |

## Workflow and deploys

Work happens on `dev` and reaches production through a pull request into `master`.

- A push to `dev` runs lint and the unit/integration tests in GitHub Actions
  (`.github/workflows/ci-push.yml`).
- A PR into `master` runs the full suite (`ci-pull.yml`): lint, unit/integration, type check,
  build + build-output tests, and a Playwright matrix with one job per spec, limited to the specs
  whose pages the PR touched. Mark **`e2e-gate`** and **`check`** as the required checks; a skipped
  matrix never reports a status.
- **Cloudflare Pages deploys on every push, independently of GitHub Actions.** It runs the build
  command below, so `build:deploy` in `package.json` is production configuration: breaking it
  disables the only deploy gate. Playwright is not part of it.

### Cloudflare dashboard settings

These live only in the Cloudflare dashboard, so check them there if a deploy misbehaves
([ADR 0003](docs/adr/0003-host-on-cloudflare-with-wrangler.md)):

| Setting | Value |
|---|---|
| Production branch | `master` (`dev` publishes a preview) |
| Build command | `pnpm run build:deploy` |
| Build output directory | `dist` |
| Node.js version | 22.16.0 (CI uses Node 24, so the unit suite effectively runs on both) |
| `GITHUB_TOKEN` (optional) | Raises GitHub's API limit from 60 to 5000 requests/hour for the projects page; the build works without it |

## Project layout

```
src/
  pages/        index, projects, blog/index, blog/[...slug]
  layouts/      Layout.astro: head tags, design tokens, shared primitives
  components/   SiteNav, ProjectImage, ProjectPreview
  content/blog/ Markdown posts
  content.config.ts  blog collection + the GitHub-backed projects collection
  lib/          github.ts, headers.ts, projectImages.ts, sanitize.ts
  assets/projects/   one image per project, named exactly after the repo
public/         same-origin scripts (nav.js, projects.js, theme-init.js)
docs/adr/       Architecture Decision Records
```

Adding things:

- **A blog post:** add `src/content/blog/<name>.md` with `title`, `description` and `pubDate`
  (`MM-DD-YYYY`) frontmatter. Posts are written a line per thought.
- **A project:** add an entry to `PROJECT_PICKS` in `src/content.config.ts` **and**
  `src/assets/projects/<repo-name>.png` (2:1, e.g. 1280×640). A test fails without the image.
- **An external resource** (script, font, API, image host): the CSP blocks anything not
  allowlisted, so update `src/lib/headers.ts` too. `pnpm test:build` checks it against the emitted
  `dist/_headers`.

## Decisions

Why the site looks the way it does is recorded in [`docs/adr/`](docs/adr/README.md): Astro with no
UI framework, a security-header policy generated into `dist/_headers`, GitHub data fetched at build
time, a native `<dialog>` for project previews, self-hosted preview images, and more.

## Working with Claude Code

`CLAUDE.md` holds the short list of gotchas, and `.claude/skills/` has step-by-step
workflows for the repeatable tasks: writing a post, adding a project, writing an ADR and adding an
external resource. `/code-review` is worth running before a PR into `master`.
