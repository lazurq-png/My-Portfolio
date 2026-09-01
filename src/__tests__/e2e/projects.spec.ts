import { test, expect } from '@playwright/test';
import { openNav } from './helpers/nav';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  });

  test('projects page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle('Martin Larsson — Software Developer');
    await expect(page.locator('main.page-shell')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Selected work' })
    ).toBeVisible();
  });

  test('projects page displays all projects', async ({ page }) => {
    const projects = page.locator('.project-grid > a');

    await expect(projects).toHaveCount(2);

    await expect(projects.nth(0)).toContainText('Portfolio Site');
    await expect(projects.nth(0)).toContainText('Astro');
    await expect(projects.nth(0)).toContainText('TypeScript');

    await expect(projects.nth(1)).toContainText(
      'Next.js Dashboard Template'
    );
    await expect(projects.nth(1)).toContainText('Next.js');
    await expect(projects.nth(1)).toContainText('React');
  });

  test('projects page displays project summaries correctly', async ({
    page,
  }) => {
    const summaries = page.locator('.project-grid .card p');

    await expect(summaries).toHaveCount(2);

    await expect(summaries.nth(0)).toContainText(
      'A polished Astro-based portfolio experience'
    );

    await expect(summaries.nth(1)).toContainText(
      'Learning how to use Next.js'
    );
  });

  test('projects page displays project links', async ({ page }) => {
    const projectLinks = page.locator('.project-grid > a');

    await expect(projectLinks).toHaveCount(2);

    await expect(projectLinks.nth(0)).toHaveAttribute(
      'href',
      'https://github.com/lazurq-png/My-Portfolio'
    );

    await expect(projectLinks.nth(1)).toHaveAttribute(
      'href',
      'https://github.com/lazurq-png/next.js-dashboard'
    );
  });

  test('projects page navigation back to homepage works', async ({ page }) => {
    await openNav(page);

    const homeLink = page.getByRole('link', { name: 'Home' });

    await expect(homeLink).toBeVisible();
    await homeLink.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'Martin Larsson' })
    ).toBeVisible();
  });

  test('projects page SEO meta tags are present', async ({ page }) => {
    await expect(page).toHaveTitle('Martin Larsson — Software Developer');

    const description = page.locator('meta[name="description"]');

    await expect(description).toHaveAttribute(
      'content',
      /Portfolio website for Martin Larsson/i
    );
  });
});