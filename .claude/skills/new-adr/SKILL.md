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
4. **ADRs are immutable once accepted.** To change a decision, write a new ADR and set the old one's
   status to `superseded by ADR-NNNN` (see 0006 -> 0014). To adjust one part of an old record, add a
   dated `> Amended ... by [NNNN](...)` note under its title (see 0017). Never rewrite the reasoning.
5. **Index**: add a row to the table in `docs/adr/README.md`.
6. Prettier ignores `*.md`, so there is nothing to format. Run `pnpm lint` anyway if you touched code.
