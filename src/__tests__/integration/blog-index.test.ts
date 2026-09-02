import { describe, test, expect, vi, beforeAll, beforeEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getCollection } from "astro:content";
import BlogIndex from "../../pages/blog/index.astro";

vi.mock("astro:content", () => ({
  getCollection: vi.fn(),
  render: vi.fn(),
}));

/**
 * The blog index against a collection it does not control.
 *
 * The empty case is the one that matters and the one e2e cannot reach without
 * deleting every post: the page has to degrade to an empty list rather than
 * throw. ADR 0008 described a test for this; the file it named was deleted in
 * 62ea1fe, so the path has been uncovered since.
 */

const mockGetCollection = vi.mocked(getCollection);

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

beforeEach(() => {
  mockGetCollection.mockReset();
});

const post = (id: string, title: string, pubDate: string) => ({
  id,
  data: { title, description: `About ${title}.`, pubDate: new Date(pubDate) },
});

const render = () =>
  container.renderToString(BlogIndex, {
    request: new Request("http://localhost/blog/"),
  });

const cardCount = (html: string) =>
  [...html.matchAll(/class="post-card"/g)].length;

const postHrefs = (html: string) =>
  [...html.matchAll(/<a class="card-link" href="([^"]*)"/g)].map((m) => m[1]);

describe("blog index with no posts", () => {
  beforeEach(() => {
    mockGetCollection.mockResolvedValue([] as never);
  });

  test("renders without throwing", async () => {
    await expect(render()).resolves.toBeTypeOf("string");
  });

  test("still renders the page heading", async () => {
    expect(await render()).toContain("Notes and reflections");
  });

  test("renders the list region with no cards in it", async () => {
    const html = await render();

    expect(html).toContain('aria-label="Blog posts"');
    expect(cardCount(html)).toBe(0);
  });
});

describe("blog index with posts", () => {
  beforeEach(() => {
    mockGetCollection.mockResolvedValue([
      post("older", "Older Post", "2026-01-01"),
      post("newest", "Newest Post", "2026-03-01"),
      post("middle", "Middle Post", "2026-02-01"),
    ] as never);
  });

  test("renders one card per post", async () => {
    expect(cardCount(await render())).toBe(3);
  });

  test("orders them newest first regardless of collection order", async () => {
    const html = await render();

    expect(postHrefs(html)).toEqual([
      "/blog/newest/",
      "/blog/middle/",
      "/blog/older/",
    ]);
  });

  test("builds each href from the sanitized slug, with a trailing slash", async () => {
    for (const href of postHrefs(await render())) {
      expect(href).toMatch(/^\/blog\/[a-zA-Z0-9-]+\/$/);
    }
  });

  test("shows each post's title and description", async () => {
    const html = await render();

    expect(html).toContain("Newest Post");
    expect(html).toContain("About Newest Post.");
  });
});
