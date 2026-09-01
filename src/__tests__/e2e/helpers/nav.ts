import { expect, type Page } from '@playwright/test';

/**
 * Which nav layout is showing is decided by a media query in an external
 * stylesheet, and `domcontentloaded` does not wait for stylesheets -- probe
 * before this resolves and every viewport looks like the unstyled one.
 */
export async function navReady(page: Page) {
  await page.waitForLoadState('load');
}

/**
 * Below 48rem the nav collapses behind a hamburger, so its links are hidden
 * until the panel is opened. The desktop projects have no visible toggle and
 * fall straight through, which keeps every spec viewport-agnostic.
 */
export async function openNav(page: Page) {
  await navReady(page);

  const toggle = page.locator('#nav-toggle');

  if (!(await toggle.isVisible())) return;

  if ((await toggle.getAttribute('aria-expanded')) === 'true') return;

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}
