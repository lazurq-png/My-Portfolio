---
name: new-adr
description: Write a new Architecture Decision Record in docs/adr/. Use when a decision changes how the project is built, tested, deployed or secured, or when asked for an ADR.
---

# New ADR

1. **Number**: the next free `NNNN` in `docs/adr/` (never reuse one). File name
   `NNNN-kebab-case-title.md`.
2. **Start from** `docs/adr/0000-adr-template.md`: frontmatter (`status`, `date` = when the decision
   was made, `decision-makers`), then Context and Problem Statement, Decision Drivers, Considered
   Options, Decision Outcome, Consequences. Name the concrete files and configs involved.
3. **State the downsides.** A Consequences section with only "Good" entries means the analysis wasn't
   done. Write it alongside the change, not afterwards.
4. **Keep ADRs correct; they never block work.** An existing ADR that is wrong or stale is fixed in
   place. A real change of decision can be a new ADR that supersedes the old one (see 0006 -> 0014).
   Only during a night run (unattended) are existing ADRs left alone; report the problem instead.
5. **No versions** of Node or any package in an ADR: record the decision and the reason. Current
   versions belong in `package.json`, the workflows and the README.
6. **Index**: add a row to the table in `docs/adr/README.md`.
7. Prettier ignores `*.md`, so there is nothing to format. Run `pnpm lint` anyway if you touched code.
