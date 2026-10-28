---
name: add-external-resource
description: Allow a new external script, font, API, image host or frame on the site. Use whenever a page needs to load something from another origin, because the CSP blocks it otherwise.
---

# Add an external resource

The Content-Security-Policy is a strict allowlist (`default-src 'self'`). A new external origin is
blocked at runtime, and only in a browser, so it can pass every test and still break in production.

1. **Ask whether it is needed.** Self-hosting is preferred: fonts and images can be bundled, and ADR
   0018 removed the last external image origin for exactly this reason (a third-party host that
   rate-limits visitors).
2. **Edit `SECURITY_HEADERS` in `src/lib/headers.ts`** (the single source of truth, ADR 0014): add the
   narrowest origin to the narrowest directive (`script-src`, `style-src`, `font-src`, `img-src`,
   `connect-src`, `frame-src`). Never a bare `https:`; `build/headers.test.ts` rejects it.
3. **Update `src/__tests__/build/headers.test.ts`** so the allowed-origins assertion names the new
   origin. The test also checks the constant against the emitted `dist/_headers` in both directions.
4. **Do not** add a top-level `headers` key to `astro.config.mjs` (Astro silently ignores it) or wire
   the policy into `server.headers` (it blocks the dev server's inline HMR).
5. **Verify in a browser**, not just tests: `pnpm build && pnpm preview`, load the page and check the
   console for "Refused to load ... Content Security Policy". Then `pnpm build:deploy`.
6. Record it in an ADR if it is a lasting exception (the `new-adr` skill).
