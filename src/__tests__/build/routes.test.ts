import { describe, test, expect, beforeAll } from "vitest";
import { readdir } from "node:fs/promises";

/**
 * One post in, one page out.
 *
 * sanitizeSlug is not injective and Astro's loader slugs ids before it ever
 * sees them, so two distinct files can collapse onto a single URL -- an
 * underscore against nothing (`my_post.md` vs `mypost.md`), or a nested path
 * against a hyphenated one (`series/one.md` vs `series-one.md`). Neither the
 * unit tests nor getStaticPaths can see that: it is only visible by comparing
 * the posts on disk against the pages the build actually produced.
 *
 * Asserting it here rather than reimplementing the loader's id derivation keeps
 * the test honest -- it measures the output, not a model of Astro's internals.
 *
 * Requires `pnpm build` first; run via `pnpm test:build`.
 */
describe("generated blog routes", () => {
  let postFiles: string[];
  let routeDirs: string[];

  beforeAll(async () => {
    postFiles = (await readdir("src/content/blog")).filter((name) =>
      /\.mdx?$/.test(name),
    );

    const entries = await readdir("dist/blog", { withFileTypes: true }).catch(() => {
      throw new Error(
        "dist/blog is missing. Run `pnpm build` before `pnpm test:build`.",
      );
    });

    routeDirs = entries.filter((entry) => entry.isDirectory()).map((e) => e.name);
  });

  test("finds posts to check", () => {
    expect(postFiles.length).toBeGreaterThan(0);
  });

  test("builds exactly one page per post, with none collapsed onto another", () => {
    expect(routeDirs).toHaveLength(postFiles.length);
  });

  test("gives every post a URL-safe slug", () => {
    for (const dir of routeDirs) {
      expect(dir).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test("leaves no post with an empty slug", () => {
    // An id of only stripped characters sanitizes to "", which would serve the
    // post at /blog// instead of its own URL.
    expect(routeDirs).not.toContain("");
  });

  test("renders each route to an index.html", async () => {
    for (const dir of routeDirs) {
      const files = await readdir(`dist/blog/${dir}`);
      expect(files).toContain("index.html");
    }
  });
});
