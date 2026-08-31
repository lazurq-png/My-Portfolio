---
title: "Finalization part 3 with Claude"
description: "Fixing some of the concerns in CLAUDE.md and adding nicer styling soonTM"
pubDate: 08-31-2026
tags: ["Astro", "AI", "Portfolio"]
---

Removed inline copy of santization of slugs in ..slug.
Instead it now imports the sanitize method.
Added ADR for everything, using a professional template.
Will need to double check all of these by hand tomorrow,
to make sure there is no useless fluff.

Had claude analyze the pipeline and give me tips on how to make it faster.

Learned:
Problem: Firefox still always fails 1-4 tests, when running more than 1 worker in playwright.
Fix: Rewrote the specific override for timeouts for firefox in playwright config
and gave it 2 retries to get from 1 fail down to 0.

Problem: Installing the same dependencies and programs everytime,
instead of using playwrights containers.
Fix: Rewrite jobs to use the proper playwright containers and use them
instead of a flat ubuntu that needs to install every program.

Edit:
Firefox continued to fail tests, seemingly at random.
The actual fix was to not run the container as root and
giving Chromium enough shared memory by adding:
"options: --user 1001 --ipc=host" to the workflow.
