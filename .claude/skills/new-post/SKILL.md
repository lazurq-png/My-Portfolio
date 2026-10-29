---
name: new-post
description: Write a new blog post for the portfolio. Use when asked to add, draft or publish a post in src/content/blog/.
---

# New blog post

1. **File**: `src/content/blog/<name>.md`. The file name becomes the URL after `sanitizeSlug()`
   (`src/lib/sanitize.ts`): lowercased by Astro, then anything outside `a-z 0-9 - _` becomes `-`
   and underscores are dropped. Two names that sanitize to the same slug (`de_mo` and `demo`)
   silently drop one post, so check `ls src/content/blog` for a clash first.
2. **Frontmatter** (the Zod schema is in `src/content.config.ts`):

   ```yaml
   ---
   title: "Short title"
   description: "One sentence; used for the meta description and the post list."
   pubDate: MM-DD-YYYY
   tags: ["Astro", "AI"]
   ---
   ```

   `title`, `description` and `pubDate` are required. `updatedDate` is optional. Markdown (`.md`)
   only; there is no MDX support. `tags` is not in the schema (Zod drops it) but every post carries
   it, so keep following that.

3. **Body**: write a line per thought. `white-space: pre-line` is applied to paragraphs and list
   items, so single newlines render as line breaks. No reflowing, and Prettier never touches `.md`.
4. `blog-post.spec.ts` reads the oldest post's frontmatter at run time, so editing any post is safe.
   Two posts must not share the oldest `pubDate` (the spec fails with a clear message).
5. **Verify**: `pnpm build && pnpm test:build` (`routes.test.ts` compares built pages with the
   posts on disk). CI skips e2e for blog-only PRs, so the build is the check.
