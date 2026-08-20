import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(({ page }) => {
    // Navigate to the homepage before each test
    page.goto('/')
  })

  test('homepage loads successfully', async ({ page }) => {
    // Given: the homepage
    // When: we wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Then: the page title should be correct
    expect(await page.title()).toContain('Martin Larsson')
    
    // And: the page should be fully rendered
    await page.waitForSelector('.hero-card')
  })

  test('homepage displays name and role correctly', async ({ page }) => {
    // Given: the homepage loads
    // When: we wait for elements to be visible and check the text
    await page.waitForSelector('h1', { timeout: 10000 })
    await page.waitForSelector('.role', { timeout: 10000 })
    
    const name = await page.textContent('h1')
    const role = await page.textContent('.role')
    
    // Then: name and role should be visible and correct
    expect(name).toContain('Martin')
    expect(role).toContain('Software Engineer')
  })
})
