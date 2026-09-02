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
});
