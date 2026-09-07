/**
 * Everything this site knows about GitHub's REST payload shape, in one place.
 *
 * Split the way ADR 0007 splits `sanitize.ts`: the mapping is a pure function so
 * it can be unit-tested against fixtures, and the single impure function that
 * touches the network is thin enough to have nothing worth testing. The caller
 * is the `projects` loader in `src/content.config.ts`, which runs at build time
 * only -- a `connect-src 'self'` CSP means the browser can never call this API,
 * so every field here has to be baked into the HTML during the build.
 */
import { z } from "astro/zod";

/**
 * The subset of `GET /repos/{owner}/{repo}` this site renders.
 *
 * Everything the card renders is nullish, because GitHub omits or nulls most of
 * it: `language` on an empty repo, `topics` unless the preview media type is
 * negotiated, and `description`/`homepage` whenever they were never filled in.
 * Unknown keys are dropped rather than rejected -- the response carries well
 * over a hundred, and a new one appearing upstream must not break a build.
 *
 * `html_url` is the exception and is required. Not because it is rendered -- it
 * is not, `repoUrl()` builds that -- but because with every field optional an
 * error body like `{"message":"API rate limit exceeded"}` parses happily into
 * an empty result, and the loader would then log nothing and quietly render a
 * card with no metadata. Requiring one field only a real repository carries is
 * what turns that into the warning it should be.
 */
export const GITHUB_REPO_SCHEMA = z.object({
  html_url: z.string(),
  description: z.string().nullish(),
  homepage: z.string().nullish(),
  language: z.string().nullish(),
  topics: z.array(z.string()).nullish(),
  forks_count: z.number().nullish(),
  stargazers_count: z.number().nullish(),
  pushed_at: z.string().nullish(),
});

/**
 * The flattened shape the project card and its preview dialog consume.
 *
 * Properties are required-but-possibly-undefined rather than optional so the
 * key set is identical whatever GitHub returned: the loader spreads this over
 * the curated fields, and a stable key set keeps that spread predictable.
 *
 * `pushedAt` stays the raw ISO string. The collection schema coerces it to a
 * Date, exactly as the blog schema does with `pubDate` -- one place decides how
 * a date is parsed.
 */
export interface RepoMeta {
  githubDescription: string | undefined;
  homepage: string | undefined;
  language: string | undefined;
  topics: string[];
  stars: number | undefined;
  forks: number | undefined;
  pushedAt: string | undefined;
}

/** GitHub returns "" rather than null for an unset description or homepage. */
function trimToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Map a raw API response onto {@link RepoMeta}.
 *
 * Total: returns `null` for anything that does not parse -- a rate-limit body,
 * a 404 JSON, `undefined` from a failed fetch -- rather than throwing. The
 * loader is deliberately fail-soft (a GitHub outage must not block a deploy),
 * and that only works if this function never throws.
 */
export function toRepoMeta(raw: unknown): RepoMeta | null {
  const parsed = GITHUB_REPO_SCHEMA.safeParse(raw);
  if (!parsed.success) return null;

  const repo = parsed.data;

  return {
    githubDescription: trimToUndefined(repo.description),
    homepage: trimToUndefined(repo.homepage),
    language: trimToUndefined(repo.language),
    topics: repo.topics ?? [],
    stars: repo.stargazers_count ?? undefined,
    forks: repo.forks_count ?? undefined,
    pushedAt: trimToUndefined(repo.pushed_at),
  };
}

/**
 * The repository's social preview card, as GitHub renders it for Open Graph.
 *
 * The leading path segment is an opaque cache key -- any value serves, and a
 * constant keeps the URL stable between builds so a CDN can cache it. Allowed
 * by the site CSP under `img-src 'self' https:` without an allowlist entry.
 */
export function socialImageUrl(nameWithOwner: string): string {
  return `https://opengraph.githubassets.com/1/${nameWithOwner}`;
}

/** Public repo URL for a `owner/name` pair. */
export function repoUrl(nameWithOwner: string): string {
  return `https://github.com/${nameWithOwner}`;
}

/**
 * Fetch one repository. Build-time only.
 *
 * Unauthenticated this is 60 requests/hour per IP, and Cloudflare Pages builds
 * come from a shared pool -- pass a token (`GITHUB_TOKEN` as a Pages
 * environment variable) to get 5000. A missing token is not an error; the
 * curated fields alone still render a card.
 *
 * Rejects on a non-2xx so the caller's `.catch()` handles transport failures
 * and API failures identically.
 */
export async function fetchRepo(
  nameWithOwner: string,
  { token }: { token?: string | undefined } = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub rejects an API request with no User-Agent outright.
    "User-Agent": "my-portfolio-build",
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    `https://api.github.com/repos/${nameWithOwner}`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} ${response.statusText} for ${nameWithOwner}`,
    );
  }

  return response.json();
}
