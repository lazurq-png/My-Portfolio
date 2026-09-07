import { describe, test, expect, vi, beforeAll, beforeEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getCollection } from "astro:content";
import Projects from "../../pages/projects.astro";

vi.mock("astro:content", () => ({
  getCollection: vi.fn(),
  render: vi.fn(),
}));

/**
 * The projects page against a collection it does not control.
 *
 * Two things here are unreachable from e2e without breaking the network. The
 * first is the empty collection: the page has to degrade to an empty region
 * rather than throw. The second is a project whose GitHub fetch failed -- the
 * loader is fail-soft by design, so that entry arrives with none of the GitHub
 * fields and still has to render.
 *
 * The button/dialog wiring is checked here too. Every card's opener addresses
 * its dialog by id, and nothing in the type system connects the two, so a
 * change to the slug on one side and not the other is the failure this file
 * exists to catch.
 */

const mockGetCollection = vi.mocked(getCollection);

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

beforeEach(() => {
  mockGetCollection.mockReset();
});

/** An entry as the loader produces it when GitHub answered. */
const enriched = (id: string, title: string) => ({
  id,
  data: {
    repo: id,
    title,
    summary: `About ${title}.`,
    stack: ["Astro", "TypeScript"],
    link: `https://github.com/${id}`,
    githubDescription: "A repo.",
    homepage: "https://example.com",
    language: "TypeScript",
    topics: ["astro", "portfolio"],
    stars: 7,
    forks: 2,
    pushedAt: new Date("2026-09-01T12:00:00Z"),
  },
});

/** An entry as the loader produces it when the fetch failed. */
const curatedOnly = (id: string, title: string) => ({
  id,
  data: {
    repo: id,
    title,
    summary: `About ${title}.`,
    stack: ["Astro"],
    link: `https://github.com/${id}`,
    topics: [],
  },
});

const render = () =>
  container.renderToString(Projects, {
    request: new Request("http://localhost/projects"),
  });

const cardCount = (html: string) =>
  [...html.matchAll(/class="post-card card"/g)].length;

const dialogIds = (html: string) =>
  [...html.matchAll(/<dialog id="([^"]+)"/g)].map((m) => m[1]);

const previewTargets = (html: string) =>
  [...html.matchAll(/data-preview="([^"]+)"/g)].map((m) => m[1]);

describe("projects page with no projects", () => {
  beforeEach(() => {
    mockGetCollection.mockResolvedValue([] as never);
  });

  test("renders without throwing", async () => {
    await expect(render()).resolves.toBeTypeOf("string");
  });

  test("still renders the page heading", async () => {
    expect(await render()).toContain("Selected work");
  });

  test("renders the list region with no cards and no dialogs in it", async () => {
    const html = await render();

    expect(html).toContain('aria-label="Project list"');
    expect(cardCount(html)).toBe(0);
    expect(dialogIds(html)).toEqual([]);
  });
});

describe("projects page with projects", () => {
  beforeEach(() => {
    mockGetCollection.mockResolvedValue([
      enriched("lazurq-png/My-Portfolio", "Portfolio Site"),
      enriched("lazurq-png/next.js-dashboard", "Dashboard"),
    ] as never);
  });

  test("renders one card per project", async () => {
    expect(cardCount(await render())).toBe(2);
  });

  test("renders one preview dialog per project", async () => {
    expect(dialogIds(await render())).toHaveLength(2);
  });

  test("every card opener addresses a dialog that exists", async () => {
    const html = await render();
    const ids = dialogIds(html);

    expect(previewTargets(html)).toHaveLength(2);

    for (const target of previewTargets(html)) {
      expect(ids).toContain(`preview-${target}`);
    }
  });

  test("derives the dialog id from the slug rules, not the raw id", async () => {
    // `owner/name` is not a usable DOM id; sanitizeSlug is what makes it one.
    expect(dialogIds(await render())).toContain("preview-lazurq-png-My-Portfolio");
  });

  test("ships every card opener disabled for the no-JavaScript case", async () => {
    const buttons = [
      ...(await render()).matchAll(/<button[^>]*class="card-open"[^>]*>/g),
    ];

    expect(buttons).toHaveLength(2);

    for (const [button] of buttons) {
      expect(button).toContain("disabled");
      // The CSS hangs the stretched hit area and the hover lift off
      // :not(:disabled), so an enabled-by-default button would make a card
      // look clickable with the script absent.
      expect(button).toContain('aria-haspopup="dialog"');
    }
  });

  test("puts the opener on the title, not on a separate control", async () => {
    const html = await render();

    // The whole card is the click target, so the title carries it -- a click
    // handler on the <article> would lose Enter/Space and the button role.
    expect(html).toMatch(/<h2[^>]*>\s*<button[^>]*class="card-open"/);
    expect(html).not.toContain("preview-btn");
  });

  test("puts the only GitHub link inside the dialog, not on the card", async () => {
    const links = [
      ...(await render()).matchAll(/class="preview__link" href="([^"]*)"/g),
    ].map((m) => m[1]);

    expect(links).toEqual([
      "https://github.com/lazurq-png/My-Portfolio",
      "https://github.com/lazurq-png/next.js-dashboard",
    ]);
  });

  test("renders no anchor at all inside the card grid", async () => {
    // The dialog is the only route to a repository. A link back on a card
    // would also sit under the opener's stretched overlay and be unclickable.
    const grid = /<section class="project-grid"[\s\S]*?<\/section>/.exec(
      await render(),
    );

    expect(grid).not.toBeNull();
    expect(grid![0]).not.toContain("<a ");
  });

  test("opens external links safely", async () => {
    const html = await render();

    for (const [anchor] of html.matchAll(/<a[^>]*github\.com[^>]*>/g)) {
      expect(anchor).toContain('rel="noopener noreferrer"');
      expect(anchor).toContain('target="_blank"');
    }
  });

  test("shows the curated title, summary and stack", async () => {
    const html = await render();

    expect(html).toContain("Portfolio Site");
    expect(html).toContain("About Portfolio Site.");
    expect(html).toContain("Astro");
  });

  test("renders the GitHub metadata in the dialog", async () => {
    const html = await render();

    expect(html).toContain("Language");
    expect(html).toContain("Stars");
    expect(html).toContain("Updated");
    expect(html).toContain("1 September 2026");
  });

  test("points the preview image at the repo's social card", async () => {
    expect(await render()).toContain(
      "https://opengraph.githubassets.com/1/lazurq-png/My-Portfolio",
    );
  });
});

describe("a project whose GitHub fetch failed", () => {
  beforeEach(() => {
    mockGetCollection.mockResolvedValue([
      curatedOnly("lazurq-png/My-Portfolio", "Portfolio Site"),
    ] as never);
  });

  test("still renders its card and its dialog", async () => {
    const html = await render();

    expect(cardCount(html)).toBe(1);
    expect(dialogIds(html)).toHaveLength(1);
  });

  test("renders no stats row rather than a row of blanks", async () => {
    const html = await render();

    expect(html).not.toContain("Language");
    expect(html).not.toContain("Stars");
    expect(html).not.toContain("Updated");
  });

  test("keeps the curated copy and the GitHub link", async () => {
    const html = await render();

    expect(html).toContain("About Portfolio Site.");
    expect(html).toContain("https://github.com/lazurq-png/My-Portfolio");
  });
});
