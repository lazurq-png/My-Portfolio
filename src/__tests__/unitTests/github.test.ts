import { describe, test, expect, vi, afterEach } from "vitest";
import {
  fetchRepo,
  repoUrl,
  socialImageUrl,
  toRepoMeta,
} from "../../lib/github";

/**
 * The GitHub mapping, which the `projects` loader leans on being total.
 *
 * The loader is deliberately fail-soft -- a rate limit or an outage must not be
 * able to fail `build:deploy` and block a deploy -- and that only holds if
 * `toRepoMeta` returns null for a junk payload instead of throwing. Most of
 * what is asserted below is that non-throwing behaviour rather than the happy
 * path, because the happy path is the one a build would show us immediately.
 */

// Trimmed to the fields the schema picks; the real response carries ~100 more,
// which is exactly why unknown keys have to be dropped rather than rejected.
const repoResponse = {
  name: "My-Portfolio",
  full_name: "lazurq-png/My-Portfolio",
  html_url: "https://github.com/lazurq-png/My-Portfolio",
  description: "  A portfolio site.  ",
  homepage: "https://my-portfolio-72x.pages.dev",
  language: "TypeScript",
  topics: ["astro", "portfolio"],
  forks_count: 2,
  stargazers_count: 7,
  pushed_at: "2026-09-01T12:00:00Z",
  visibility: "public",
};

describe("toRepoMeta", () => {
  test("maps a full response onto the flat card shape", () => {
    expect(toRepoMeta(repoResponse)).toEqual({
      githubDescription: "A portfolio site.",
      homepage: "https://my-portfolio-72x.pages.dev",
      language: "TypeScript",
      topics: ["astro", "portfolio"],
      stars: 7,
      forks: 2,
      pushedAt: "2026-09-01T12:00:00Z",
    });
  });

  test("leaves pushedAt as the raw ISO string for the schema to coerce", () => {
    expect(toRepoMeta(repoResponse)?.pushedAt).toBeTypeOf("string");
  });

  test("ignores keys the schema does not pick", () => {
    const meta = toRepoMeta(repoResponse);

    expect(meta).not.toHaveProperty("visibility");
    expect(meta).not.toHaveProperty("full_name");
  });

  test("survives the nulls GitHub sends for unset fields", () => {
    const meta = toRepoMeta({
      ...repoResponse,
      description: null,
      homepage: null,
      language: null,
      topics: null,
    });

    expect(meta).toMatchObject({
      githubDescription: undefined,
      homepage: undefined,
      language: undefined,
      topics: [],
    });
  });

  test("treats GitHub's empty-string description and homepage as absent", () => {
    const meta = toRepoMeta({ ...repoResponse, description: "", homepage: "   " });

    expect(meta?.githubDescription).toBeUndefined();
    expect(meta?.homepage).toBeUndefined();
  });

  test("defaults topics to an empty array when the key is missing entirely", () => {
    const { topics: _topics, ...withoutTopics } = repoResponse;

    expect(toRepoMeta(withoutTopics)?.topics).toEqual([]);
  });

  test("keeps a real zero rather than dropping it", () => {
    const meta = toRepoMeta({ ...repoResponse, stargazers_count: 0 });

    // ?? not ||: a repo with no stars still has a star count.
    expect(meta?.stars).toBe(0);
  });

  // Each of these is a payload the loader can genuinely be handed: null comes
  // from its own .catch(), and the others from an error body served as JSON.
  test.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "Not Found"],
    ["an array", []],
    ["a rate-limit body", { message: "API rate limit exceeded" }],
    ["a wrongly typed field", { ...repoResponse, stargazers_count: "seven" }],
  ])("returns null for %s instead of throwing", (_label, payload) => {
    expect(() => toRepoMeta(payload)).not.toThrow();
    expect(toRepoMeta(payload)).toBeNull();
  });

  test("rejects a payload with no html_url as not being a repository", () => {
    // The reason html_url is the one required field: with everything optional,
    // an error body parses into an empty-but-valid result and the loader logs
    // no warning while silently rendering a card with no metadata.
    const { html_url: _url, ...withoutUrl } = repoResponse;

    expect(toRepoMeta(withoutUrl)).toBeNull();
  });

  test("accepts a repo carrying nothing but html_url", () => {
    // A brand-new empty repository really does come back like this, and it is
    // a success, not a failure -- the card just has little to show.
    expect(toRepoMeta({ html_url: "https://github.com/owner/name" })).toEqual({
      githubDescription: undefined,
      homepage: undefined,
      language: undefined,
      topics: [],
      stars: undefined,
      forks: undefined,
      pushedAt: undefined,
    });
  });
});

describe("url builders", () => {
  test("socialImageUrl points at GitHub's Open Graph card", () => {
    expect(socialImageUrl("lazurq-png/My-Portfolio")).toBe(
      "https://opengraph.githubassets.com/1/lazurq-png/My-Portfolio",
    );
  });

  test("socialImageUrl stays on an https host the CSP's img-src allows", () => {
    expect(socialImageUrl("owner/name")).toMatch(/^https:\/\//);
  });

  test("repoUrl builds the public repository URL", () => {
    expect(repoUrl("lazurq-png/next.js-dashboard")).toBe(
      "https://github.com/lazurq-png/next.js-dashboard",
    );
  });
});

describe("fetchRepo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubFetch = (response: Partial<Response>) => {
    const spy = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", spy);
    return spy;
  };

  test("requests the repo endpoint with the headers GitHub requires", async () => {
    const spy = stubFetch({ ok: true, json: async () => repoResponse });

    await fetchRepo("lazurq-png/My-Portfolio");

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://api.github.com/repos/lazurq-png/My-Portfolio");
    // GitHub rejects an API request with no User-Agent outright.
    expect(init.headers).toMatchObject({
      Accept: "application/vnd.github+json",
      "User-Agent": expect.any(String),
    });
  });

  test("sends no Authorization header when there is no token", async () => {
    const spy = stubFetch({ ok: true, json: async () => repoResponse });

    await fetchRepo("owner/name");

    const [, init] = spy.mock.calls[0] as [string, RequestInit];

    expect(init.headers).not.toHaveProperty("Authorization");
  });

  test("sends a bearer token when one is supplied", async () => {
    const spy = stubFetch({ ok: true, json: async () => repoResponse });

    await fetchRepo("owner/name", { token: "ghp_example" });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];

    expect(init.headers).toMatchObject({ Authorization: "Bearer ghp_example" });
  });

  test("rejects on a non-2xx so the loader's catch handles it like a transport failure", async () => {
    stubFetch({ ok: false, status: 403, statusText: "rate limit exceeded" });

    await expect(fetchRepo("owner/name")).rejects.toThrow(/403/);
  });
});
