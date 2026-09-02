/**
 * Security response headers served for every path.
 *
 * Single source of truth for three consumers: the `security-headers` integration
 * in `astro.config.mjs` that writes them into `dist/_headers`, the build-output
 * test that asserts they actually shipped, and anyone reading the policy.
 *
 * These used to live as a top-level `headers` array in `astro.config.mjs`, which
 * is not an Astro config option -- Astro's schema only has `server.headers`, and
 * Zod strips unknown top-level keys silently, so nothing was ever emitted. See
 * ADR 0014.
 */
export const SECURITY_HEADERS: ReadonlyArray<readonly [name: string, value: string]> = [
  [
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://cdn.astro.build; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https:; font-src https:; connect-src 'self'",
  ],
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
];

/**
 * Render the header set as a Cloudflare `_headers` file body: a path pattern
 * followed by indented `Name: value` lines.
 *
 * @see https://developers.cloudflare.com/workers/static-assets/headers/
 */
export function renderHeadersFile(
  headers: ReadonlyArray<readonly [string, string]> = SECURITY_HEADERS,
): string {
  return ["/*", ...headers.map(([name, value]) => `  ${name}: ${value}`)].join("\n") + "\n";
}
