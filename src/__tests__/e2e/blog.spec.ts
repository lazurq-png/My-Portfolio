import { test, expect } from '@playwright/test';
import { openNav } from './helpers/nav';

test.describe('Blog Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
  });

  test('blog page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle('Martin Larsson — Software Developer');
    await expect(page.locator('main.page-shell')).toBeVisible();
    await expect(page.locator('.hero')).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Notes and reflections' })
    ).toBeVisible();
  });

  test('blog page displays intro text correctly', async ({ page }) => {
    const intro = page.locator('.hero .intro');

    await expect(intro).toBeVisible();
    await expect(intro).toContainText('Short posts on design choices');
    await expect(intro).toContainText('technologies');
  });

  test('blog page displays all blog posts', async ({ page }) => {
    const postCards = page.locator('.post-list .post-card');

    await expect(postCards.first()).toBeVisible();

    for (const post of await postCards.all()) {
      await expect(post.locator('h2')).toBeVisible();
      await expect(post.locator('p')).toBeVisible();
      await expect(post.locator('div').first()).toBeVisible();
    }
  });

  test('blog page displays posts in reverse chronological order', async ({
    page,
  }) => {
    const postDates = await page
      .locator('.post-list .post-card > div:first-child')
      .allTextContents();

    const dates = postDates.map((date) => new Date(date.trim()).getTime());

    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  test('blog page displays post links correctly', async ({ page }) => {
    const postLinks = page.locator('.post-list > a');

    for (const link of await postLinks.all()) {
      const href = await link.getAttribute('href');

      expect(href).toBeTruthy();
      expect(href).toMatch(/^\/blog\/.+\/$/);
    }
  });

  test('blog page navigation to individual post works', async ({ page }) => {
    const firstPostLink = page.locator('.post-list > a').first();

    await expect(firstPostLink).toBeVisible();

    await firstPostLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/blog\/.+\/$/);
    await expect(page.locator('.article-shell')).toBeVisible();
    await expect(page.locator('.article-title')).toBeVisible();
  });

  test('blog page navigation back to homepage works', async ({ page }) => {
    await openNav(page);

    const homeLink = page.getByRole('link', { name: 'Home' });

    await expect(homeLink).toBeVisible();

    await homeLink.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.hero-card')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Martin Larsson' })
    ).toBeVisible();
  });

  test('blog page SEO meta tags are present', async ({ page }) => {
    await expect(page).toHaveTitle('Martin Larsson — Software Developer');

    const descriptionMeta = page.locator('meta[name="description"]');

    await expect(descriptionMeta).toHaveAttribute(
      'content',
      'Portfolio website for Martin Larsson, a software developer working across systems, web, and modern tooling.'
    );
  });
});