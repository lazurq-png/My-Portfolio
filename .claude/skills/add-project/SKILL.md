---
name: add-project
description: Add a project to the portfolio's projects page. Use when asked to add, remove or change a project card or its preview image.
---

# Add a project

1. **Pick**: add an entry to `PROJECT_PICKS` in `src/content.config.ts`:
   `repo` (`owner/name`, exactly as in the GitHub URL), `title`, `summary`, `stack` (tags). Stars,
   language, topics and last-push date are fetched from GitHub at build time (ADR 0016); don't copy
   them in by hand.
2. **Image (required)**: `src/assets/projects/<repo-name>.png`, 2:1 (for example 1280x640), named
   **exactly** after the repo including case (`Questionable-candy.png`; the Linux build is
   case-sensitive and Windows is not). Use a screenshot, or GitHub's social card:

   ```bash
   curl -o src/assets/projects/<repo-name>.png https://opengraph.githubassets.com/1/<owner>/<repo>
   ```

   The card embeds live counts, so it goes stale; a screenshot doesn't. Never hot-link the host from
   the page (ADR 0018). `integration/projectAssets.test.ts` fails if the file is missing.

3. **Don't add** an `<a>` to the card (the dialog's "View on GitHub" is the only route out, ADR 0017)
   or any CSP origin.
4. **Verify**: `pnpm test:unit`, `pnpm build && pnpm test:build`, and look at `/projects` in a
   browser. If GitHub data looks stale in dev, delete `.astro/`. An unauthenticated build can hit the
   60 requests/hour limit; the loader then warns and renders curated fields only.
