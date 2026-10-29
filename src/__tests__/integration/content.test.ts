import { describe, test, expect } from "vitest";
import { collections } from "../../content.config";
import { z } from "astro/zod";

/**
 * Frontmatter conformance for every post, checked against the *same* schema the
 * build uses rather than a copy of it.
 *
 * `pnpm build` already rejects a malformed post, but that only runs on pull
 * requests -- this puts the same failure on every push to dev, in milliseconds
 * and pointing at the offending file.
 */

// `schema` is declared as `S | ((context: SchemaContext) => S)`; this collection
// uses the plain form. If it ever needs `image()` again it becomes the function
// form, and this cast is what to revisit.
const blogSchema = collections.blog.schema as z.ZodType;

const posts = Object.entries(
  import.meta.glob<{ frontmatter: Record<string, unknown> }>("/src/content/blog/*.md", {
    eager: true,
  }),
);

describe("blog content collection", () => {
  test("finds the posts on disk", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  test.each(posts)("%s satisfies the collection schema", (_path, module) => {
    const result = blogSchema.safeParse(module.frontmatter);

    expect(result.success ? null : result.error.issues).toBeNull();
  });

  test("gives every post a distinct title", () => {
    const titles = posts.map(([, module]) => module.frontmatter.title);

    expect(new Set(titles).size).toBe(titles.length);
  });
});
