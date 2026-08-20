import { test, expect } from '@playwright/test';

test.describe('Blog Posts', () => {
  test('blog page displays more than 0 posts', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const postLinks = page.locator('.post-list > a');

    await expect(postLinks.first()).toBeVisible();

    const postCount = await postLinks.count();
    expect(postCount).toBeGreaterThan(0);
  });

  test.describe('Oldest Blog Post', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' });

      const postLinks = page.locator('.post-list > a');

      await expect(postLinks.first()).toBeVisible();

      const postCount = await postLinks.count();
      expect(postCount).toBeGreaterThan(0);

      // Posts are displayed newest first, so the last post is the oldest.
      await postLinks.last().click();

      await expect(page.locator('.article-shell')).toBeVisible();
    });

    test('oldest blog post loads successfully', async ({ page }) => {
      await expect(page.locator('.article-shell')).toBeVisible();
      await expect(page.locator('.article-title')).toBeVisible();
      await expect(page.locator('.article-prose')).toBeVisible();
    });

    test('oldest blog post has the correct title and content', async ({ page }) => {
      await expect(page.locator('.article-title')).toHaveText(
        'Learning Astro.js'
      );
    });

    test('oldest blog post has the correct publication date', async ({ page }) => {
      const postDate = page.locator('.post-date').first();

      await expect(postDate).toBeVisible();
      await expect(postDate).toContainText('5 August 2026');

    });

    test('oldest blog post can navigate back to the blog index', async ({
      page,
    }) => {
      const backLink = page.locator('a[href="/blog"]').filter({
        has: page.locator('img'),
      });

      await expect(backLink).toBeVisible();
      await backLink.click();

      await expect(page).toHaveURL(/\/blog\/?$/);
      await expect(
        page.getByRole('heading', { name: 'Notes and reflections' })
      ).toBeVisible();
    });

    test('oldest blog post is accessible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.locator('.article-shell')).toBeVisible();
      await expect(page.locator('.article-title')).toBeVisible();
      await expect(page.locator('.article-prose')).toBeVisible();
    });

    test('oldest blog post is accessible on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await expect(page.locator('.article-shell')).toBeVisible();
      await expect(page.locator('.article-title')).toBeVisible();
      await expect(page.locator('.article-prose')).toBeVisible();
    });

    test('oldest blog post has SEO metadata', async ({ page }) => {
      await expect(page).toHaveTitle('Martin Larsson — Software Developer');

      const descriptionMeta = page.locator('meta[name="description"]');

      await expect(descriptionMeta).toHaveAttribute(
        'content',
        'Portfolio website for Martin Larsson, a software developer working across systems, web, and modern tooling.'
      );
    });
  });
});