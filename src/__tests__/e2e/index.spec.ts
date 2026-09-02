import { test, expect } from '@playwright/test';
import { navReady, openNav } from './helpers/nav';

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
    await openNav(page);

    const projectsLink = page.getByRole('link', { name: 'My Projects' });

    await expect(projectsLink).toBeVisible();
    await projectsLink.click();

    await expect(page).toHaveURL(/\/projects\/?$/);
    await expect(
      page.getByRole('heading', { name: 'Selected work' })
    ).toBeVisible();
  });

  test('primary nav exposes links, theme toggle and social icons', async ({
    page,
  }) => {
    await navReady(page);

    const toggle = page.locator('#nav-toggle');
    const menu = page.locator('#main-menu');

    // Only the mobile project renders a visible toggle; on desktop the rail is
    // always open, so the assertions below run against both layouts.
    const isCollapsed = await toggle.isVisible();

    if (isCollapsed) {
      await expect(menu).toBeHidden();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }

    await expect(menu).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Projects' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Toggle color theme' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'GitHub profile' })
    ).toBeVisible();

    if (isCollapsed) {
      await toggle.click();
      await expect(menu).toBeHidden();
    }
  });
});
