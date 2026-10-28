import { expect, test } from "@playwright/test";
import { oldestPost } from "./helpers/posts";

// Expectations come from the post's own frontmatter (helpers/posts.ts), not from
// literals, so rewording or redating the oldest post does not break this spec.
const post = oldestPost();

test.describe("Blog Posts", () => {
  test.describe("Oldest Blog Post", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/blog/", { waitUntil: "domcontentloaded" });

      const postLinks = page.locator(".post-list > a");

      await expect(postLinks.first()).toBeVisible();
      expect(await postLinks.count()).toBeGreaterThan(0);

      // Posts are displayed newest first, so the last post is the oldest.
      await postLinks.last().click();

      await expect(page.locator(".article-shell")).toBeVisible();
    });

    test("oldest blog post loads successfully", async ({ page }) => {
      await expect(page.locator(".article-shell")).toBeVisible();
      await expect(page.locator(".article-title")).toBeVisible();
      await expect(page.locator(".article-prose")).toBeVisible();
    });

    test("oldest blog post has the title from its frontmatter", async ({ page }) => {
      await expect(page.locator(".article-title")).toHaveText(post.title);
    });

    test("oldest blog post has the publication date from its frontmatter", async ({ page }) => {
      const postDate = page.locator(".post-date").first();

      await expect(postDate).toBeVisible();
      await expect(postDate).toContainText(post.displayDate);
    });

    test("oldest blog post can navigate back to the blog index", async ({ page }) => {
      const backLink = page.locator('main a.back-link[href="/blog/"]');

      await expect(backLink).toBeVisible();
      await backLink.click();

      await expect(page).toHaveURL(/\/blog\/?$/);
      await expect(page.getByRole("heading", { name: "Notes and reflections" })).toBeVisible();
    });

    test("oldest blog post has SEO metadata", async ({ page }) => {
      await expect(page).toHaveTitle(`${post.title} — Martin Larsson`);

      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        post.description,
      );
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");

      // `site` is set, so the canonical URL is absolute and ends in this page's path.
      const { pathname } = new URL(page.url());
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(/^https:\/\//);
      expect(new URL(canonical ?? "").pathname).toBe(pathname);
    });
  });
});
