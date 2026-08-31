---
status: "accepted"
date: "2026-08-14"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0006. Set security headers in the build config

## Context and Problem Statement

The site is static and has no user input, no authentication and no database, so
the classic server-side attack surface is absent. What remains is what the
browser is willing to do on the page: which scripts it will execute, which
origins it will load fonts and images from, whether the page can be framed, and
whether it can be reached over plain HTTP. Those are controlled by response
headers. Where should those headers be defined so that they are reviewable,
versioned, and hard to lose?

## Decision Drivers

* The policy should be reviewed like code, in the same pull request as the change
  that needs it.
* Adding an external resource should fail visibly rather than silently widen the
  attack surface.
* The site must be HTTPS-only and must not be framable.
* Whatever is chosen has to work with the Cloudflare deployment in
  [0003](0003-host-on-cloudflare-with-wrangler.md).

## Considered Options

* Declare headers in `astro.config.mjs`
* A `_headers` file in the static output
* Cloudflare dashboard Transform Rules
* No custom headers

## Decision Outcome

Chosen option: "Declare headers in `astro.config.mjs`". The policy lives in the
repository next to the code whose needs it encodes, so a pull request that adds
an external font or script shows the CSP change alongside it. The alternatives
either separate the policy from the code (Transform Rules) or express it as an
untyped text file with no relationship to the config that caused the need.

The set is: a Content-Security-Policy, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, a one-year `Strict-Transport-Security` with
`includeSubDomains; preload`, and `Referrer-Policy:
strict-origin-when-cross-origin`.

### Consequences

* Good, because the policy is versioned, diffable and reviewed with the code.
* Good, because the CSP is a strict allowlist — `default-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'` — so adding
  any new external script, font or API endpoint breaks at runtime until the
  policy is deliberately updated. That failure mode is the point.
* Good, because `frame-ancestors 'none'` and `X-Frame-Options: DENY` block
  clickjacking, and HSTS with preload removes the plaintext downgrade window.
* Bad, because `style-src` needs `'unsafe-inline'`. Astro emits scoped component
  styles inline, so the decision in
  [0005](0005-no-ui-framework-scoped-styles-only.md) directly forces the weakest
  directive in the policy. This is a real, if small, XSS mitigation lost.
* Bad, because `font-src https:` and `img-src 'self' https:` permit any HTTPS
  origin. The site loads fonts from Google Fonts and images from itself, so both
  could be narrowed to named origins; as written they are considerably broader
  than the rest of the policy.
* Bad, because the whole config object is cast `/** @type {any} */`, which
  disables type checking on it. A misspelled header name or a malformed value
  would not be caught at build time despite the strict TypeScript setup in
  [0012](0012-use-typescript-strict-config.md).
* Neutral, because several directives guard against risks this site does not
  have — there is no user-generated content and no form handling. They cost
  nothing to keep and are correct defence in depth, but the earlier judgement
  that some of it is "unused fluff" is fair.

### Confirmation

There is no automated check today, and that is the weakest part of this decision.
The build config is only half the delivery path: verify with `curl -I` against
the deployed Cloudflare URL that every header above is actually present on a
response. Doing that after each deploy is currently a manual step.

## Pros and Cons of the Options

### Headers in `astro.config.mjs`

* Good, because the policy sits beside the configuration that creates the need
  for it — the icon integration, the font links, the CSP, all in view together.
* Good, because it is versioned and reviewed as code.
* Neutral, because it is Astro-specific; moving frameworks means porting it.
* Bad, because the `any` cast removes type safety from exactly the file where a
  silent typo is most costly.

### A `_headers` file

* Good, because it is a hosting convention understood by several providers, so it
  is portable.
* Good, because it is versioned in the repository too.
* Bad, because it is an untyped text file with no connection to the build,
  making it easy to leave stale when the code's needs change.
* Bad, because syntax errors are silent — a malformed line is ignored, not
  reported.

### Cloudflare dashboard Transform Rules

* Good, because it applies at the edge regardless of what the build produces,
  and can be changed without a deploy.
* Bad, because the policy would live outside version control, invisible in code
  review and unrecoverable from the repository alone.
* Bad, because it couples the security posture to one provider's dashboard,
  undoing the portability the static output otherwise has.

### No custom headers

* Good, because there is nothing to maintain.
* Bad, because the site would be framable, would allow MIME sniffing, and would
  have no defence against an injected script beyond hoping none is injected.
* Bad, because the cost of the alternative is a few dozen lines, so this saves
  almost nothing.

## More Information

Defined in [`astro.config.mjs`](../../astro.config.mjs). Reasoning at the time is
recorded in
[`security-with-Nanbeige.md`](../../src/content/blog/security-with-Nanbeige.md)
and
[`security-mostly-without-AI.md`](../../src/content/blog/security-mostly-without-AI.md).
Related: [0007](0007-centralise-sanitization-in-lib.md) covers the application-
level half of the same concern.

Two follow-ups worth doing: narrow `font-src` and `img-src` to named origins, and
add a header check to CI or to the deploy step so the Confirmation above is not
manual.
