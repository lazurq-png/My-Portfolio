import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('homepage loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle('Martin Larsson — Software Developer');
    await expect(page.locator('.hero-card')).toBeVisible();
  });

  test('homepage displays name and role correctly', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Martin Larsson' })
    ).toBeVisible();

    await expect(page.locator('.role')).toBeVisible();
    await expect(page.locator('.role')).toHaveText('Software Engineer');
  });

  test('homepage displays status message correctly', async ({ page }) => {
    await expect(page.locator('.status')).toBeVisible();
    await expect(page.locator('.status')).toContainText(
      'Currently building things with Astro + Next.js'
    );
  });

  test('homepage displays bio content', async ({ page }) => {
    await expect(page.locator('.bio')).toBeVisible();
    await expect(page.locator('.bio')).toContainText(
      'Swedish software developer'
    );
  });

  test('homepage navigation to projects works', async ({ page }) => {
    const projectsLink = page.getByRole('link', { name: 'My Projects' });

    await expect(projectsLink).toBeVisible();
    await projectsLink.click();

    await expect(page).toHaveURL(/\/projects\/?$/);
    await expect(
      page.getByRole('heading', { name: 'Selected work' })
    ).toBeVisible();
  });

  test('homepage SEO meta tags are present', async ({ page }) => {
    await expect(page).toHaveTitle('Martin Larsson — Software Developer');

    const descriptionMeta = page.locator('meta[name="description"]');

    await expect(descriptionMeta).toHaveAttribute(
      'content',
      'Portfolio website for Martin Larsson, a software developer working across systems, web, and modern tooling.'
    );
  });
});

