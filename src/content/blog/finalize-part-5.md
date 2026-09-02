---
title: "Finalization part 5"
description: "Mostly reviewing and learning from yesterdays work."
pubDate: 09-02-2026
tags: ["Astro", "AI", "Portfolio", "Testing"]
---

Short about the 5 new integration test files from yesterday:

- layout.test.ts
  tests the newly added props in Layout.astro

- sitenav.test.ts
  tests links and aria related current page information

- blog-index.test.ts
  testing an empty blog collection and a sorting test (will need to refactor this later since I plan to add sorting/filtering by tags for example)

- blog-routes.test.ts
  pretty selfexplanitory, it tests the blog post routing

- content.test.ts
  tests local blog post files, so that they follow the correct schema

- overall/other changes
  some of the above tests are guard-rails against sloppy coding/changing something that will break on current or other parts of the website. Like changing or misspelling a URL or prop.
  new config for vitest to make integration tests able to import and work.
  Also re-wrote all tests to use "test" instead of "it", more or less because I prefer the clearer indication that it's a test.
  These new tests also brought to light some redundant ones and methods + tests that did not work in the first place.
