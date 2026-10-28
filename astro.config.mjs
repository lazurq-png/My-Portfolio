// @ts-check
import { writeFile } from "node:fs/promises";

import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import icon from "astro-icon";

import { renderHeadersFile } from "./src/lib/headers.ts";

/**
 * Writes the security policy from `src/lib/headers.ts` into `dist/_headers`,
 * the file Cloudflare Pages reads to attach response headers to static assets.
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
    name: "security-headers",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        await writeFile(new URL("_headers", dir), renderHeadersFile(), "utf8");
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  // The deployed origin. Makes canonical, og:url and og:image absolute, and is what
  // the sitemap integration builds its URLs from.
  site: "https://my-portfolio-72x.pages.dev",
  integrations: [icon(), sitemap(), securityHeaders()],
  // Responsive <Image>: emits srcset/sizes so a phone is not sent the 1280px dialog image.
  image: { layout: "constrained", responsiveStyles: true },
  // Self-hosted fonts (ADR 0019): fetched from Google at build time, served from /_astro/.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-inter",
      weights: [400, 500, 600, 700],
      styles: ["normal"],
    },
    {
      provider: fontProviders.google(),
      name: "IBM Plex Mono",
      cssVariable: "--font-plex-mono",
      weights: [400, 500, 600],
      styles: ["normal"],
    },
  ],
});
