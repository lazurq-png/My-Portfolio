// @ts-check
import { writeFile } from 'node:fs/promises';

import { defineConfig } from 'astro/config';

import icon from 'astro-icon';

import { renderHeadersFile } from './src/lib/headers.ts';

/**
 * Writes the security policy from `src/lib/headers.ts` into `dist/_headers`,
 * which is the file Cloudflare reads to attach response headers to the static
 * assets in `wrangler.jsonc`.
 *
 * This is a build-time hook rather than a config key because Astro has no
 * top-level `headers` option -- the array that used to sit in this file was
 * silently discarded by the config schema and never reached production. The
 * policy still lives in the repository next to the code whose needs it encodes,
 * which was the point of ADR 0006; only the delivery mechanism changed. See
 * ADR 0014.
 *
 * Not wired into `server.headers` (dev/preview) on purpose: a `script-src 'self'`
 * CSP blocks the dev server's inline HMR bootstrap.
 *
 * @returns {import('astro').AstroIntegration}
 */
function securityHeaders() {
  return {
    name: 'security-headers',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        await writeFile(new URL('_headers', dir), renderHeadersFile(), 'utf8');
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [icon(), securityHeaders()],
});
