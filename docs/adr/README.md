# Architecture Decision Records

An ADR captures one architecturally significant decision: the situation that
forced a choice, the options that were genuinely on the table, the option taken,
and what that costs. The point is not to justify the decision — it is to let a
future reader (including a future you) understand *why* the code looks the way
it does, and to know when the reasoning has expired.

Format is [MADR 4.0](https://adr.github.io/madr/), trimmed for a solo project:
the `consulted` and `informed` frontmatter fields are dropped, and `Confirmation`
is kept only where a real check exists.

## Index

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-use-astro-as-site-framework.md) | Use Astro as the site framework | Accepted | 2026-08-05 |
| [0002](0002-author-content-as-markdown-content-collection.md) | Author content as Markdown in a typed content collection | Accepted | 2026-08-05 |
| [0003](0003-host-on-cloudflare-with-wrangler.md) | Host on Cloudflare Pages, built and deployed from Git | Accepted (corrected 2026-09-04) | 2026-08-11 |
| [0004](0004-use-pnpm-as-package-manager.md) | Use pnpm as the package manager | Accepted | 2026-08-11 |
| [0005](0005-no-ui-framework-scoped-styles-only.md) | Ship no UI framework; scoped styles only | Accepted | 2026-08-11 |
| [0006](0006-set-security-headers-in-build-config.md) | Set security headers in the build config | Superseded by [0014](0014-emit-security-headers-as-a-generated-headers-file.md) | 2026-08-14 |
| [0007](0007-centralise-sanitization-in-lib.md) | Centralise sanitization in `src/lib/sanitize.ts` | Accepted | 2026-08-14 |
| [0008](0008-use-vitest-for-unit-tests.md) | Use Vitest for unit tests | Accepted | 2026-08-20 |
| [0009](0009-use-playwright-for-e2e-tests.md) | Use Playwright for end-to-end tests | Accepted | 2026-08-20 |
| [0010](0010-separate-unit-and-e2e-test-scopes.md) | Keep unit and e2e test scopes disjoint | Accepted | 2026-08-20 |
| [0011](0011-run-ci-on-github-actions.md) | Run CI on GitHub Actions, split by trigger | Accepted | 2026-08-25 |
| [0012](0012-use-typescript-strict-config.md) | Use TypeScript in Astro's `strict` config | Accepted | 2026-08-26 |
| [0013](0013-render-icons-with-astro-icon.md) | Render icons with astro-icon and a bundled icon set | Accepted | 2026-08-28 |
| [0014](0014-emit-security-headers-as-a-generated-headers-file.md) | Emit security headers as a generated `_headers` file | Accepted | 2026-09-01 |
| [0015](0015-add-an-integration-test-scope.md) | Add an integration test scope between the unit and e2e suites | Accepted | 2026-09-01 |

## Conventions

- **One decision per file.** If the title needs an "and also", that is two ADRs.
- **The filename carries the number**: `NNNN-kebab-case-title.md`, numbered in
  the order decisions were *made*. Numbers are never reused, even if an ADR is
  rejected or withdrawn.
- **ADRs are immutable once accepted.** Changing your mind means writing a new
  ADR that supersedes the old one, and setting the old one's status to
  `superseded by ADR-NNNN`. Do not rewrite the reasoning in an accepted ADR —
  the record of what you believed at the time is the value. Fixing a typo or a
  broken link is fine.
- **State the downsides.** A `Consequences` section with only `Good` entries
  means the analysis was not done.
- Start from [`0000-adr-template.md`](0000-adr-template.md).

## A note on dates

This set was written retroactively on 2026-08-31, reconstructed from the commit
history and the development blog in `src/content/blog/`. The `date:` field on
each record is when the decision was actually made, not when it was written
down. ADRs from here on should be authored alongside the change they describe.

Two consequences of that, worth knowing before checking a record against the
repository:

- **A record may cite a commit that postdates its own `date:`.** 0005 is dated
  2026-08-11 and cites `0b05d4a` (2026-08-27); 0007 is dated 2026-08-14 and cites
  `6e58de9` (2026-08-31); 0008 is dated 2026-08-20 and cites `0f15e89`
  (2026-08-27). These are not errors — the author knew what had happened by
  2026-08-31 — but the `date:` field is not a horizon on what a record can refer
  to.
- **The retroactive records are the least reliable ones.** 0009 and 0011 in
  particular describe a CI and Playwright setup that commit `9c60997` replaced on
  the same day they were written, so parts of both were stale on arrival. They
  carry editorial notes saying so. The records authored alongside their change —
  0003, 0012, 0014, 0015 — have held up.
