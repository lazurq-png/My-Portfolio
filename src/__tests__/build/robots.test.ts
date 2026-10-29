import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

/**
 * public/robots.txt hard-codes the sitemap URL, while the sitemap itself is built
 * from `site` in astro.config.mjs. Change the domain in one place only and crawlers
 * are sent to a sitemap that does not exist. The built sitemap index is the
 * reference, since it comes from `site`.
 *
 * Requires `pnpm build` first; run via `pnpm test:build`.
 */
describe("dist/robots.txt", () => {
  test("points at the sitemap the build actually wrote", async () => {
    const robots = await readFile("dist/robots.txt", "utf8").catch(() => {
      throw new Error("dist/robots.txt is missing. Run `pnpm build` before `pnpm test:build`.");
    });
    const index = await readFile("dist/sitemap-index.xml", "utf8");

    const pointer = /^Sitemap:\s*(\S+)/m.exec(robots)?.[1];
    // The index's first <loc> is a child sitemap on the configured site.
    const site = /<loc>(https?:\/\/[^/]+)\//.exec(index)?.[1];

    expect(site).toBeDefined();
    expect(pointer).toBe(`${site}/sitemap-index.xml`);
  });
});
