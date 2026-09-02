import { describe, test, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Layout from "../../layouts/Layout.astro";

/**
 * Layout.astro's prop fallbacks and canonical construction.
 *
 * The e2e suite only ever sees the two concrete outcomes the real pages produce
 * -- a page that passes all four props ([...slug].astro) and pages that pass
 * none. The defaulting itself, and the `Astro.site` branch, are only reachable
 * from here.
 */

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (props: Record<string, unknown>, path = "/") =>
  container.renderToString(Layout, {
    props,
    request: new Request(`http://localhost${path}`),
  });

const attr = (html: string, selector: RegExp) => html.match(selector)?.[1];

const title = (html: string) => attr(html, /<title>([^<]*)<\/title>/);
const description = (html: string) =>
  attr(html, /<meta name="description" content="([^"]*)"/);
const canonical = (html: string) =>
  attr(html, /<link rel="canonical" href="([^"]*)"/);
const ogType = (html: string) =>
  attr(html, /<meta property="og:type" content="([^"]*)"/);
const ogUrl = (html: string) =>
  attr(html, /<meta property="og:url" content="([^"]*)"/);

describe("Layout with no props", () => {
  test("falls back to the site-wide title and description", async () => {
    const html = await render({});

    expect(title(html)).toBe("Martin Larsson — Software Developer");
    expect(description(html)).toBe(
      "Portfolio website for Martin Larsson, a software developer working across systems, web, and modern tooling.",
    );
  });

  test("defaults ogType to website", async () => {
    expect(ogType(await render({}))).toBe("website");
  });

  test("defaults canonicalPath to the current pathname", async () => {
    expect(canonical(await render({}, "/projects/"))).toBe("/projects/");
  });
});

describe("Layout with props", () => {
  const props = {
    title: "A Post — Martin Larsson",
    description: "What the post is about.",
    canonicalPath: "/blog/a-post/",
    ogType: "article",
  };

  test("reflects every prop into the document head", async () => {
    const html = await render(props, "/blog/a-post/");

    expect(title(html)).toBe(props.title);
    expect(description(html)).toBe(props.description);
    expect(canonical(html)).toBe(props.canonicalPath);
    expect(ogType(html)).toBe("article");
  });

  test("mirrors the title and description into the og tags", async () => {
    const html = await render(props);

    expect(html).toContain(`<meta property="og:title" content="${props.title}">`);
    expect(html).toContain(
      `<meta property="og:description" content="${props.description}">`,
    );
  });

  test("keeps og:url and canonical in step", async () => {
    const html = await render(props, "/blog/a-post/");

    expect(ogUrl(html)).toBe(canonical(html));
  });

  test("prefers an explicit canonicalPath over the current pathname", async () => {
    const html = await render({ canonicalPath: "/blog/a-post/" }, "/somewhere-else/");

    expect(canonical(html)).toBe("/blog/a-post/");
  });
});

describe("Layout canonical URLs", () => {
  /**
   * astro.config.mjs sets no `site`, so canonical and og:url are emitted
   * root-relative -- valid, but weaker for crawlers, which is the standing TODO
   * in Layout.astro. This test is the tripwire for that change: set `site` and
   * it fails, telling you the URLs went absolute as intended. The absolute
   * branch stays uncovered until then rather than being faked here.
   */
  test("emits root-relative URLs while `site` is unset", async () => {
    const html = await render({}, "/blog/");

    expect(canonical(html)).toBe("/blog/");
    expect(canonical(html)).not.toMatch(/^https?:\/\//);
  });
});

describe("Layout document shell", () => {
  test("renders slotted content inside the app shell", async () => {
    const html = await container.renderToString(Layout, {
      props: {},
      slots: { default: "<p>slotted</p>" },
      request: new Request("http://localhost/"),
    });

    expect(html).toMatch(/<div class="app-shell">\s*<p>slotted<\/p>/);
  });

  test("declares the viewport, without which the mobile layout cannot work", async () => {
    expect(await render({})).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
  });
});
