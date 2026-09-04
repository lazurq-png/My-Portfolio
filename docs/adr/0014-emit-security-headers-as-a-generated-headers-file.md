---
status: "accepted"
date: "2026-09-01"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0014. Emit security headers as a generated `_headers` file

## Context and Problem Statement

[0006](0006-set-security-headers-in-build-config.md) decided to declare the
security headers in `astro.config.mjs`, as a top-level `headers` array. That
option does not exist. Astro's config schema has no top-level `headers` key —
only `server.headers`, which applies to `astro dev` and `astro preview` and never
to a built site — and the schema is a non-strict Zod object, so it discarded the
array without a word. No `_headers` file was written, `wrangler.jsonc` publishes
`./dist` as-is, and the site was therefore served with **no** Content-Security-Policy,
HSTS, `X-Frame-Options`, `X-Content-Type-Options` or `Referrer-Policy` for the
entire time that config stood.

Two things hid it. The config object was cast `/** @type {any} */`, which 0006
noted would stop a *misspelled header name* being caught — in fact it stopped the
entire option being caught. And nothing in the test suite ever looked at the build
output: the unit tests cover pure functions and the e2e suite asserts rendered
DOM, so neither could see a missing file. How should the policy be delivered so
that it actually reaches the browser, and so that this class of failure is
visible?

*[2026-09-04: one premise above is wrong — `wrangler.jsonc` does not publish
`./dist`, or anything. It is skipped entirely: Cloudflare Pages wants
`pages_build_output_dir` and the file carries a Workers `assets` block, so the
build log warns and ignores it. The output directory that actually ships is the
one in the dashboard build settings. See the correction at the top of
[0003](0003-host-on-cloudflare-with-wrangler.md), which postdates this record by
three days. Nothing about this decision changes — the deployment reads
`dist/_headers` either way, and `Parsed 1 valid header rule` in the deploy log
confirms it. The same stale premise sits in the doc comment on
`securityHeaders()` in [`astro.config.mjs`](../../astro.config.mjs), which is
worth correcting there too.]*

## Decision Drivers

* The policy must reach production. This is the requirement 0006 failed.
* A delivery failure must break a check, not pass silently.
* Keep 0006's real driver: the policy stays in the repository, versioned and
  reviewed in the same pull request as the change that needs it.
* Must work with the Cloudflare Pages deployment in
  [0003](0003-host-on-cloudflare-with-wrangler.md).

## Considered Options

* Generate `dist/_headers` from an `astro:build:done` integration hook
* A hand-written `public/_headers` file
* Cloudflare dashboard Transform Rules
* `security.csp` in `astro.config.mjs`

## Decision Outcome

Chosen option: "Generate `dist/_headers` from an `astro:build:done` integration
hook". The policy lives in `src/lib/headers.ts` as a typed constant; a small
inline integration in `astro.config.mjs` renders it into `dist/_headers` at the
end of every build; and `src/__tests__/build/headers.test.ts` imports the same
constant and asserts it against the file the build produced.

That last part is the point of the decision as much as the first. The mechanism
is now verified against its output rather than trusted, so a future change that
breaks delivery fails `pnpm test:build` in CI instead of quietly removing the
site's headers.

The `/** @type {any} */` cast is removed along with the key that needed it.

### Consequences

* Good, because the headers are actually served. This is not an improvement over
  the previous state; the previous state did nothing.
* Good, because one constant feeds the emitter and the assertion, so the policy
  cannot drift from what ships — the test fails in both directions, a header
  dropped from the policy and a header left in the output.
* Good, because removing the `any` cast restores type checking over the whole
  config, which is what [0012](0012-use-typescript-strict-config.md) was for.
* Good, because the policy text is still reviewed as code, next to the config
  whose needs it encodes, which was 0006's genuine motivation.
* Bad, because `_headers` is a Cloudflare-specific text format with no schema. A
  malformed directive *value* still ships; the test asserts the file's structure
  and the presence of each header, not that a browser accepts the policy.
* Bad, because the check needs a build to have run, so it cannot join the suite
  that gates every push to `dev` — it runs in the pull-request `build` job only.
  A broken policy is caught before `master`, not before `dev`.
* Neutral, because the headers are deliberately not wired into `server.headers`.
  A `script-src 'self'` policy blocks the dev server's inline HMR bootstrap, and
  local e2e runs against `pnpm dev`. Dev and production therefore differ here.
* Neutral, because the policy *text* is carried over from 0006 unchanged. Every
  caveat 0006 records about it still applies — `'unsafe-inline'` in `style-src`,
  and the broad `font-src https:` and `img-src 'self' https:`.

### Confirmation

`pnpm build && pnpm test:build`. The suite asserts `dist/_headers` opens with a
`/*` rule, contains every entry in `SECURITY_HEADERS` indented beneath it,
contains nothing else, and that the CSP still carries `default-src 'self'`,
`object-src 'none'`, `frame-ancestors 'none'` and `form-action 'self'`.

Verified against the deployment with
`curl -sI https://<domain>/ | grep -i content-security-policy`, which returned
nothing before this change.

Re-verified 2026-09-04 against the preview deployment of commit `a1cf5f1`
(`https://4f90a7c6.my-portfolio-72x.pages.dev`): all five headers are present on
the live response and match `SECURITY_HEADERS` exactly. Cloudflare Pages reports
`Parsed 1 valid header rule` in the deploy log, which is the earlier signal that
`dist/_headers` was picked up — check that line before reaching for `curl`.

## Pros and Cons of the Options

### `astro:build:done` hook generating `dist/_headers`

* Good, because it produces the artifact Cloudflare reads while keeping the
  policy in typed source that other code can import.
* Good, because the generated file is an output, so it cannot drift from the
  source of truth the way a second hand-maintained file would.
* Bad, because it is more machinery than a static file: a hook, a renderer and a
  test, where a plain text file would be one file.

### Hand-written `public/_headers`

* Good, because it is the simplest thing that works — `public/` is copied
  verbatim, so no hook is needed at all.
* Bad, because the policy becomes an untyped text file with no relationship to
  the config that creates the need for it. This is the objection 0006 raised
  when it considered and rejected this option, and it is still correct; the
  mistake in 0006 was the conclusion that its own option would work, not this
  criticism.

### Cloudflare Transform Rules

* Good, because it needs no build-time machinery.
* Bad, because the policy moves out of the repository entirely: not diffable,
  not reviewable alongside the code, and not visible to anyone reading this
  project. A pull request adding an external script would show no CSP change.

### `security.csp` in `astro.config.mjs`

* Good, because it is a real, typed Astro option, unlike the key 0006 used.
* Bad, because it only emits a CSP — via `<meta>` and per-page hashes — and does
  nothing for HSTS, `X-Frame-Options`, `X-Content-Type-Options` or
  `Referrer-Policy`, so a second mechanism would be needed regardless.
* Bad, because a `<meta>`-delivered CSP cannot express `frame-ancestors`, which
  is one of the four directives this policy exists for.

## More Information

Supersedes [0006](0006-set-security-headers-in-build-config.md), whose record of
*why* these particular headers were chosen remains the reference for the policy
text. The scope that the verifying test lives in is described in
[0015](0015-add-an-integration-test-scope.md).

Cloudflare Pages' `_headers` support — the page that applies to this deployment,
and the one [`src/lib/headers.ts`](../../src/lib/headers.ts) itself cites:
<https://developers.cloudflare.com/pages/configuration/headers/>
