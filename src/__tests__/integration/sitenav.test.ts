import { describe, test, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import SiteNav from "../../components/SiteNav.astro";

/**
 * SiteNav's active-link rules, which are pure `Astro.url.pathname` logic and so
 * need no browser: exact match for "/", prefix match for everything else.
 *
 * The e2e specs assert the nav is usable; they never enumerate which link is
 * marked current from an arbitrary path. A post URL keeping "Blog" highlighted
 * is the case most easily broken by a well-meant tweak to that condition.
 */

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (path: string) =>
  container.renderToString(SiteNav, {
    request: new Request(`http://localhost${path}`),
  });

/** The href of every link carrying aria-current="page". */
function currentLinks(html: string): string[] {
  return [...html.matchAll(/<a href="([^"]*)"[^>]*aria-current="page"/g)].map(
    (match) => match[1],
  );
}

describe("SiteNav active link", () => {
  test("marks Home current on the homepage only", async () => {
    expect(currentLinks(await render("/"))).toEqual(["/"]);
  });

  test("marks Blog current on the blog index", async () => {
    expect(currentLinks(await render("/blog/"))).toEqual(["/blog/"]);
  });

  test("keeps Blog current on an individual post", async () => {
    // The prefix match is the point: a reader inside a post should still see
    // where they are in the nav.
    expect(currentLinks(await render("/blog/some-post/"))).toEqual(["/blog/"]);
  });

  test("marks Projects current on the projects page", async () => {
    expect(currentLinks(await render("/projects/"))).toEqual(["/projects/"]);
  });

  test("does not mark Home current away from the homepage", async () => {
    // "/" is an exact match rather than a prefix, or it would match everything.
    expect(currentLinks(await render("/projects/"))).not.toContain("/");
  });

  test("marks nothing current on a path outside the nav", async () => {
    expect(currentLinks(await render("/nowhere/"))).toEqual([]);
  });
});

describe("SiteNav structure", () => {
  test("renders every primary link", async () => {
    const html = await render("/");

    for (const href of ["/", "/projects/", "/blog/"]) {
      expect(html).toContain(`<a href="${href}"`);
    }
  });

  test("starts closed, so the mobile panel is collapsed before nav.js runs", async () => {
    const html = await render("/");

    expect(html).toContain('data-open="false"');
    expect(html).toContain('aria-expanded="false"');
  });

  test("omits the LinkedIn icon while its URL is unset", async () => {
    // linkedinUrl is an empty-string template in SiteNav.astro: filling it in is
    // meant to be the only change needed, so this fails the moment it is set.
    expect(await render("/")).not.toContain("LinkedIn profile");
  });

  test("opens external profile links safely", async () => {
    const html = await render("/");

    expect(html).toMatch(
      /href="https:\/\/github\.com[^"]*"[^>]*rel="noopener noreferrer"/,
    );
  });
});
