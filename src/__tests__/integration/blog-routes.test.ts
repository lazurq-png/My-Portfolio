import { describe, test, expect, vi, beforeEach } from "vitest";
import { getCollection } from "astro:content";
import { getStaticPaths } from "../../pages/blog/[...slug].astro";

vi.mock("astro:content", () => ({
  getCollection: vi.fn(),
  render: vi.fn(),
}));

const mockGetCollection = vi.mocked(getCollection);

const post = (id: string) => ({
  id,
  data: { title: id, description: "d", pubDate: new Date("2026-01-01") },
});

/**
 * The seam between the content collection and the routes it generates.
 *
 * Real ids arrive already github-slugged by Astro's glob loader (lowercase, no
 * path separators), so these mocked ids are deliberately rougher than anything
 * on disk -- the point is to pin what sanitizeSlug does when it is handed one.
 */
describe("blog post getStaticPaths", () => {
  beforeEach(() => {
    mockGetCollection.mockReset();
  });

  test("returns one route per post", async () => {
    mockGetCollection.mockResolvedValue([post("first"), post("second")] as never);

    const paths = await getStaticPaths();

    expect(paths.map((p) => p.params.slug)).toEqual(["first", "second"]);
  });

  test("passes the entry and its slug through as props", async () => {
    const entry = post("a-post");
    mockGetCollection.mockResolvedValue([entry] as never);

    const [route] = await getStaticPaths();

    expect(route.props.post).toBe(entry);
    expect(route.props.slug).toBe("a-post");
  });

  test("sanitizes an id that would otherwise escape the blog directory", async () => {
    mockGetCollection.mockResolvedValue([post("../../etc/passwd")] as never);

    const [route] = await getStaticPaths();

    expect(route.params.slug).toBe("etc-passwd");
  });

  test("renders an empty collection as no routes at all", async () => {
    mockGetCollection.mockResolvedValue([] as never);

    await expect(getStaticPaths()).resolves.toEqual([]);
  });

  /**
   * Characterization, not endorsement: sanitizeSlug is not injective, so two
   * distinct ids can land on one URL and getStaticPaths will happily emit both.
   * Nothing here deduplicates. The guard that actually protects the site is the
   * page-count assertion in src/__tests__/build/routes.test.ts, which compares
   * the built output against the posts on disk. If this ever starts collapsing
   * or rejecting duplicates, that is a deliberate change -- update this test.
   */
  test("currently emits duplicate routes when two ids sanitize alike", async () => {
    mockGetCollection.mockResolvedValue([post("my_post"), post("mypost")] as never);

    const paths = await getStaticPaths();

    expect(paths.map((p) => p.params.slug)).toEqual(["mypost", "mypost"]);
  });
});
