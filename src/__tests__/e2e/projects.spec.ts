import { test, expect } from "@playwright/test";
import { navReady, openNav } from "./helpers/nav";

/**
 * The projects page and its preview dialogs.
 *
 * Assertions here are structural rather than pinned to a particular project.
 * The list is a content collection now, enriched from the GitHub API at build
 * time, so a card's stars, language and last-pushed date change without anyone
 * touching this repository -- and the list itself changes whenever
 * PROJECT_PICKS does. Exactly one content assertion is kept, against the
 * portfolio repo, so the file still proves it is looking at the real page.
 */

test.describe("Projects Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
  });

  test("projects page loads successfully", async ({ page }) => {
    await expect(page).toHaveTitle("Martin Larsson — Software Developer");
    await expect(page.locator("main.page-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected work" })).toBeVisible();
  });

  test("projects page displays project cards", async ({ page }) => {
    const cards = page.locator(".project-grid .post-card");

    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("the cards themselves carry no links", async ({ page }) => {
    // The preview dialog is the only route to a repository now, so a link
    // reappearing on a card means the overlay/stacking problem is back.
    await expect(page.locator(".project-grid a")).toHaveCount(0);
  });

  test("every project’s dialog links to a GitHub repository", async ({ page }) => {
    const links = page.locator("dialog.preview .preview__link");

    // count() does not wait. The web-first assertion does, so a page still being
    // (re)loaded -- the dev server reloads on its first request -- is not read as empty.
    await expect(links).not.toHaveCount(0);
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toHaveAttribute("href", /^https:\/\/github\.com\/.+/);
      // Opening in a new tab without noopener hands the target a window
      // reference back into this page.
      await expect(links.nth(i)).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test("the portfolio repo is one of the projects", async ({ page }) => {
    await expect(page.locator('dialog.preview a[href$="/lazurq-png/My-Portfolio"]')).toHaveCount(1);
  });

  test("the card opener is enabled once the script runs", async ({ page }) => {
    // It ships disabled so a visitor without JavaScript gets an inert card
    // rather than one that looks clickable and does nothing.
    await expect(page.locator(".card-open").first()).toBeEnabled();
  });

  test("clicking anywhere on the card opens that project’s dialog", async ({ page }) => {
    const card = page.locator(".project-grid .post-card").first();
    const slug = await card.locator(".card-open").getAttribute("data-preview");

    // The centre of the card is empty space, not the title -- so this only
    // passes if the opener's stretched overlay really covers the card.
    await card.click();

    const dialog = page.locator(`#preview-${slug}`);

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog.getByRole("heading")).toBeVisible();
    await expect(dialog.getByRole("link", { name: /View on GitHub/ })).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/.+/,
    );
  });

  test("the whole card hit-tests to the opener", async ({ page }) => {
    const card = page.locator(".project-grid .post-card").first();

    // boundingBox() and elementFromPoint() do not wait, and beforeEach only waited
    // for DOMContentLoaded, which comes before the stylesheet. Measured that early
    // the card can have no box yet, or the overlay (which needs the CSS and the
    // enabled button) is not there to be hit -- both seen on CI's WebKit.
    await navReady(page);
    await expect(card.locator(".card-open")).toBeEnabled();
    await expect(card).toBeVisible();

    const box = await card.boundingBox();

    expect(box).not.toBeNull();

    const topmost = await page.evaluate(
      (point) => document.elementFromPoint(point.x, point.y)?.className ?? null,
      { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
    );

    expect(topmost).toContain("card-open");
  });

  test("the dialog closes on Escape", async ({ page }) => {
    await page.locator(".project-grid .post-card").first().click();

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
  });

  test("a keyboard user gets focus back on the card they opened", async ({ page }) => {
    const button = page.locator(".card-open").first();

    // Focused and activated from the keyboard rather than clicked, because
    // WebKit follows the macOS convention of *not* focusing a button on click
    // -- a clicked button is never the previously-focused element there, so
    // there would be nothing for the dialog to restore focus to. The keyboard
    // path is the one where focus restoration actually matters.
    // A disabled button cannot take focus, so wait for projects.js to arm it.
    await expect(button).toBeEnabled();
    await button.focus();
    await page.keyboard.press("Enter");

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    // Visible is not yet focused: wait until showModal() has moved focus into the
    // dialog, or Escape can race it and leave nothing to restore (flaked on CI WebKit).
    await expect(button).not.toBeFocused();

    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    // showModal() restores focus to whatever opened the dialog. Nothing in
    // public/projects.js implements this -- the point is that nothing there
    // breaks it either.
    await expect(button).toBeFocused();
  });

  test("the dialog closes on its Close button", async ({ page }) => {
    await page.locator(".project-grid .post-card").first().click();

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Close" }).click();

    await expect(dialog).toBeHidden();
  });

  test("the dialog closes on a backdrop click", async ({ page }) => {
    await page.locator(".project-grid .post-card").first().click();

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // The dialog is centred, so the top-left corner of the viewport is
    // backdrop. A click there has the <dialog> element itself as its target,
    // which is how public/projects.js tells backdrop from content.
    await page.mouse.click(2, 2);

    await expect(dialog).toBeHidden();
  });

  test.describe("with JavaScript off", () => {
    test.use({ javaScriptEnabled: false });

    test("the cards stay inert and a plain link list leads to GitHub", async ({ page }) => {
      await expect(page.locator(".card-open").first()).toBeDisabled();

      const fallback = page.getByRole("region", { name: "Project repositories" });
      await expect(fallback).toBeVisible();
      await expect(fallback.getByRole("link", { name: "Portfolio Site" })).toHaveAttribute(
        "href",
        "https://github.com/lazurq-png/My-Portfolio",
      );
    });
  });

  test("the no-JavaScript link list stays hidden when scripts run", async ({ page }) => {
    await expect(page.locator(".card-open").first()).toBeEnabled();
    await expect(page.getByRole("region", { name: "Project repositories" })).toHaveCount(0);
  });

  test("projects page navigation back to homepage works", async ({ page }) => {
    await openNav(page);

    const homeLink = page.getByRole("link", { name: "Home" });

    await expect(homeLink).toBeVisible();
    await homeLink.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Martin Larsson" })).toBeVisible();
  });
});
