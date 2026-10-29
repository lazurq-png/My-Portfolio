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
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'",
  ],
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  // No `preload`: the HSTS preload list only takes apex domains you own, so on
  // *.pages.dev it did nothing but imply an enrolment that never happened. Add it
  // back with a custom apex domain, after submitting that domain to hstspreload.org.
  ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
];

/**
 * Render the header set as a Cloudflare `_headers` file body: a path pattern
 * followed by indented `Name: value` lines.
 *
 * @see https://developers.cloudflare.com/pages/configuration/headers/
 */
export function renderHeadersFile(
  headers: ReadonlyArray<readonly [string, string]> = SECURITY_HEADERS,
): string {
  return ["/*", ...headers.map(([name, value]) => `  ${name}: ${value}`)].join("\n") + "\n";
}
