---
title: "Testing tests to test"
description: "Unit test with Vitest"
pubDate: 08-18-2026
tags: ["astro", "Testing", "Vitest"]
---

Installed Vitest and added a test folder in the project.
Reading through Vitests docs I have relearned some of the basic concepts of how to write Unit tests.
After much trial and error... I have also learned how and why you use mocking, thus I have only added a single mock test for now.
Here are some things I learned:
when testing framework methods like "getCollection" from astro:content, it is better to use vi.mock,
rather than actually trying to test the real live environment. (which is also not part of unit testing).
relearned the concepts of edge cases (for example testing if code handles beyond maximum value of a variable type or negative values).
With my current mockimplementation I can also test prop values for my blog posts.
Testing continnues tomorrow...
