import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { navReady } from "./helpers/nav";
import { sanitizeSlug } from "../../lib/sanitize";
import { oldestPost } from "./helpers/posts";

/**
 * Automated accessibility checks on the rendered DOM.
 *
 * ESLint's jsx-a11y rules read the template source; axe reads what the browser
 * built -- computed colour contrast in both themes, ARIA relations after the scripts
 * ran, the open <dialog>, the opened mobile menu. Neither replaces the other.
 *
 * Axe's result does not depend on the engine, so this runs on Chromium only: three
 * more browsers would repeat the same findings at three times the cost.
 */
test.skip(({ browserName }) => browserName !== "chromium", "axe results are engine-independent");

// The dev server (what runs locally; CI serves the built dist/) re-optimises
// dependencies on its first request and reloads that page, which destroys an axe scan
// in flight. One throwaway visit lets it settle before the first real scan.
test.beforeAll(async ({ browser }, testInfo) => {
  const { baseURL } = testInfo.project.use;
  const page = await browser.newPage(baseURL ? { baseURL } : {});
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.close();
});

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();

  // Print what failed and where, not just a count.
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `  ${n.target}: ${n.any.map((c) => c.message).join("; ")}`).join("\n")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

/** theme-init.js reads this key before first paint, so no click or reload is needed. */
async function withTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
}

const post = oldestPost();
const PAGES = [
  { name: "home", path: "/" },
  { name: "projects", path: "/projects/" },
  { name: "blog index", path: "/blog/" },
  { name: "a blog post", path: `/blog/${sanitizeSlug(post.id.toLowerCase())}/` },
  { name: "the 404 page", path: "/this-page-does-not-exist/" },
];

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    for (const { name, path } of PAGES) {
      test(`${name} has no axe violations`, async ({ page }) => {
        await withTheme(page, theme);
        await page.goto(path, { waitUntil: "load" });
        await navReady(page);
        await expectNoViolations(page);
      });
    }

    test("an open project dialog has no axe violations", async ({ page }) => {
      await withTheme(page, theme);
      await page.goto("/projects/", { waitUntil: "load" });

      const opener = page.locator(".card-open").first();
      await expect(opener).toBeEnabled();
      await opener.click();
      await expect(page.locator("dialog[open]")).toBeVisible();

      await expectNoViolations(page);
    });
  });
}

test.describe("on a phone", () => {
  // test.use rather than setViewportSize: the viewport is declared up front, not
  // changed mid-test. 375px is below the 48rem breakpoint where the nav collapses.
  test.use({ viewport: { width: 375, height: 812 } });

  test("the opened mobile menu has no axe violations", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await navReady(page);

    const toggle = page.locator("#nav-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await expectNoViolations(page);
  });
});
