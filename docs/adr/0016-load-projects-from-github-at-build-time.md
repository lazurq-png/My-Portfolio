---
status: "accepted"
date: "2026-09-07"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0016. Load the projects list from the GitHub API at build time

## Context and Problem Statement

`src/pages/projects.astro` held its data as a literal array in the component
frontmatter: title, summary, stack tags and a GitHub URL per project. Half of
that array restated facts GitHub already owns — the languages a repo is written
in, its topics, when it was last touched — and restating them is how they go
stale. It was also the only content in the project that lived inside a page
rather than behind a loader; the blog went through `src/content.config.ts` in
[0002](0002-author-content-as-markdown-content-collection.md) and this never
followed.

The page was being extended with a preview widget
([0017](0017-preview-projects-in-a-native-dialog.md)), which needs more about a
repository than a hand-written array plausibly carries. Where should that data
come from, and when should it be fetched?

## Decision Drivers

* The site CSP sets `connect-src 'self'`
  ([0014](0014-emit-security-headers-as-a-generated-headers-file.md)), so the
  browser cannot call `api.github.com` at all. Any GitHub data has to be in the
  HTML before it ships.
* `pnpm build:deploy` is the production deploy gate — Cloudflare Pages runs it
  and nothing else stops a bad deploy ([0003](0003-host-on-cloudflare-with-wrangler.md)).
  Whatever is added to the build must not be able to fail it for reasons that
  have nothing to do with the change being deployed.
* The summary and stack tags are editorial. GitHub's one-line description and
  language percentages are not a substitute for them.
* Unauthenticated GitHub is 60 requests/hour *per IP*, and Cloudflare's build
  machines come from a shared pool.

## Considered Options

* A `projects` content collection with a loader that enriches a curated list
* A loader that lists every public repo from `GET /users/{user}/repos`
* A local `projects.json` behind Astro's `file()` loader
* Leave the array in the page

## Decision Outcome

Chosen option: "a `projects` collection that enriches a curated list". A
`PROJECT_PICKS` array in `src/content.config.ts` holds the repo name and the
editorial copy; the loader fetches `GET /repos/{owner}/{repo}` for each one at
build time and merges in language, topics, stars and `pushed_at`. The page calls
`getCollection("projects")` and knows nothing about GitHub.

Curated rather than fully automatic because the two halves are not the same kind
of fact. What to show and how to frame it is a decision; how many stars a repo
has is a lookup. Listing every public repo would have replaced the first with
the second and put every scratch repository on the page.

**The loader is deliberately fail-soft.** Every GitHub-derived field is optional
in the schema, a failed fetch is a `logger.warn`, and the card renders from the
curated fields alone. A rate limit or a GitHub outage must not be able to block a
deploy of an unrelated change, and with the build command as the only gate that
is exactly what a throwing loader would do.

Knowledge of the payload lives in `src/lib/github.ts`, following
[0007](0007-centralise-sanitization-in-lib.md): `toRepoMeta` is pure and total,
and `fetchRepo` is the single function that touches the network.

`GITHUB_REPO_SCHEMA` requires `html_url` and nothing else. That one required
field is load-bearing: with every field optional, `{"message":"API rate limit
exceeded"}` parsed into a valid-but-empty result, and the loader would have
logged nothing while quietly rendering a card with no metadata. The unit suite
caught that before it shipped.

### Consequences

* Good, because the facts GitHub owns are now read from GitHub on every deploy
  instead of being copied into a file that nobody remembers to update.
* Good, because the editorial copy stays in the repository, in one obvious place,
  and adding a project is still a one-object edit.
* Good, because the page frontmatter is now three lines and the data has a schema
  the same way the blog does.
* Bad, because the build now depends on a third party being reachable. It
  degrades rather than fails, but "the preview has no stats today" is a failure
  mode that did not exist before, and the only signal is a line in a build log
  nobody reads unless something looks wrong.
* Bad, because deploys are no longer reproducible from the repository alone. Two
  builds of the same commit can produce different HTML.
* Bad, because `GITHUB_TOKEN` is now deploy configuration living only in the
  Cloudflare dashboard — the same class of invisible setting
  [0003](0003-host-on-cloudflare-with-wrangler.md) warns about for the build
  command and output directory.
* Neutral, because the token is optional. Without it the build still works at 60
  requests/hour, which two projects and a handful of daily deploys sit well
  inside.

### Confirmation

`src/__tests__/unitTests/github.test.ts` asserts `toRepoMeta` is total — it
returns `null` rather than throwing for every payload the loader can actually be
handed, including a rate-limit body — which is the property the fail-soft
behaviour rests on. `src/__tests__/integration/projects.test.ts` renders the page
against an entry with no GitHub fields and asserts it still produces a card. The
failure path itself is verified by hand: put a nonexistent repo in
`PROJECT_PICKS` and confirm the build warns and exits zero.

Nothing enforces that `GITHUB_TOKEN` is set. By design — it is an optimisation,
not a requirement.

## Pros and Cons of the Options

### Curated list enriched from GitHub

* Good, because each half of a project's data is owned by whoever knows it best.
* Bad, because it is the only option that puts a network call in the build.

### Every public repo from the users endpoint

* Good, because a new project would appear with no edit at all.
* Bad, because the page would show GitHub's descriptions instead of written ones,
  and every experiment and fork alongside the work worth showing.

### Local `projects.json` behind `file()`

* Good, because it is still the standard Astro pattern, schema-validated, and
  cannot fail a build.
* Bad, because it solves only the "data does not belong in a component" half of
  the problem. Every fact would still be hand-maintained and still go stale.

### Leave the array in the page

* Good, because it works and costs nothing.
* Bad, because it was already drifting, and the preview widget needs data the
  array does not carry.

## More Information

Rejected without much deliberation: fetching from the browser. `connect-src
'self'` blocks it, relaxing the CSP to allow `api.github.com` would spend a real
security property on a cosmetic feature, and it would put every visitor's browser
against a 60/hour unauthenticated limit.

See [`src/lib/github.ts`](../../src/lib/github.ts),
[`src/content.config.ts`](../../src/content.config.ts) and
[0017](0017-preview-projects-in-a-native-dialog.md), which is what motivated the
change.
