---
status: "accepted"
date: "2026-08-11"
decision-makers: "Martin Larsson (@lazurq-png)"
---

# 0004. Use pnpm as the package manager

## Context and Problem Statement

The project pulls in a framework, a test runner, a browser automation suite and a
deployment CLI. Installs happen locally on a Windows machine without
administrator rights and in CI on Ubuntu runners, and both have to produce the
same dependency tree. Exactly one lockfile should be committed, and the choice of
package manager decides which one. Which manager?

## Decision Drivers

* Reproducible installs across a Windows development machine and Linux CI.
* Install speed and disk usage, given Playwright and a full icon set in the tree.
* Supply-chain caution: postinstall scripts from transitive dependencies should
  not run unreviewed.
* Undeclared ("phantom") dependencies should fail at install time rather than in
  production.

## Considered Options

* pnpm
* npm
* Yarn

## Decision Outcome

Chosen option: "pnpm". Beyond the content-addressed store and its speed, pnpm is
the only one of the three that makes dependency build scripts an explicit
allowlist. `pnpm-workspace.yaml` uses that: `allowBuilds` permits build scripts
for `esbuild`, `sharp` and `workerd` and nothing else, and
`minimumReleaseAgeExclude` carries a single deliberate exemption for
`astro@7.2.2`.

### Consequences

* Good, because `allowBuilds` is an explicit allowlist. No transitive dependency
  can execute a postinstall script without the file being edited, which is the
  cheapest available defence against a common supply-chain attack.
* Good, because pnpm's strict, symlinked `node_modules` surfaces undeclared
  dependencies at install time instead of at runtime in production.
* Good, because `pnpm install --frozen-lockfile` in both CI workflows makes
  installs reproducible and fails loudly when `package.json` and the lockfile
  disagree.
* Good, because the content-addressed store keeps repeated installs and the CI
  cache cheap despite a large dependency tree.
* Bad, because pnpm is not on the default `PATH` on the development machine and
  has to be invoked from a binaries directory, since there are no rights to
  change `PATH` system-wide. This is documented in the global `CLAUDE.md` but it
  is real, recurring friction.
* Bad, because `minimumReleaseAgeExclude: astro@7.2.2` is a deliberate hole in
  the release-age quarantine that protects against compromised fresh releases.
  It should be removed once that specific version is no longer needed; nothing
  currently prompts that cleanup.
* Neutral, because any contributor would need pnpm installed. `npm install`
  against this repository would produce a divergent tree and an uncommitted
  second lockfile.

### Confirmation

Only `pnpm-lock.yaml` is committed; the presence of a `package-lock.json` or
`yarn.lock` means the decision has been violated. Both workflows in
`.github/workflows/` use `pnpm/action-setup@v4` and install with
`--frozen-lockfile`, so a lockfile that drifts from `package.json` fails CI.

## Pros and Cons of the Options

### pnpm

* Good, because it is the only one of the three with a first-class build-script
  allowlist and a minimum-release-age quarantine.
* Good, because the strict module layout catches phantom dependencies.
* Good, because installs are fast and disk-cheap through the shared store.
* Neutral, because it needs `pnpm/action-setup` in CI — one extra step, which
  deliberately takes no `version` input: the version comes from the
  `packageManager` field in `package.json`, and supplying both fails the step
  whenever they disagree.
* Bad, because it is the least universally installed of the three, so it is one
  more thing to have present on any machine that touches the project.

### npm

* Good, because it ships with Node, so it is always available with no setup.
* Neutral, because `npm ci` gives reproducible installs, matching
  `--frozen-lockfile`.
* Bad, because the flat `node_modules` layout allows phantom dependencies to
  work locally and then break elsewhere.
* Bad, because `ignore-scripts` is all-or-nothing — there is no per-package
  allowlist, so the choice is "all scripts" or "no scripts, including the three
  that genuinely need them here".

### Yarn

* Good, because Yarn Berry's Plug'n'Play is strict about dependency resolution
  and its zero-install story is genuinely fast.
* Bad, because PnP still causes compatibility problems with tools that assume a
  real `node_modules` — a risk not worth taking with Playwright and Wrangler in
  the tree.
* Bad, because it offers no clear advantage over pnpm on any driver above, so it
  would be a coin flip with more migration surface.

## More Information

Configuration lives in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) and
[`package.json`](../../package.json). Note that `package.json` declares
`engines.node >= 22.12.0` while CI runs Node 24 — see
[0011](0011-run-ci-on-github-actions.md).

Revisit `minimumReleaseAgeExclude` whenever the Astro version is next bumped.
