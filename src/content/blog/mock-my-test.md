---
title: "Mocking all the tests"
description: "Unit test with Vitest (again) and some playwright testing"
pubDate: 08-19-2026
tags: ["astro", "Testing", "Vitest", "Playwright"]
---

Added tests for both sanitizeSlug() and sanitizeContentForDisplay() methods,
to make sure slugs and their content are indeed being sanitized for any bad data/input.
Rewrote blog.test.ts since I learned how to make mocks work for multiple different results.
Instead of trying to mock the same method again while resetting it etc,
the best practice way was to mock the method with no paramaters and use mockResolvedValue()
with the paramaters you want.
Then use beforeEach() with vi.mocked(getCollection).mockReset() to always have a fresh version.
Now it sucessfully mocks getCollection() both when it returns an empty array and when it has data.
Playwright, much like I remember Cypress also does, needs some overhead to not fail tests when running
many tests at the same time or too fast.
Will need to fix this tomorrow to then start adding all the tests I have prepared.
