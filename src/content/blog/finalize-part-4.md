---
title: "Finalization part 4 and some learning"
description: "Hopefully Janus does not steal all my time."
pubDate: 09-01-2026
tags: ["Astro", "AI", "Portfolio", "CSS", "Testing"]
---

All pages now use the same styling, turning the overall theme less jarring when you switch between them.
Started using rem instead of px for @media queries. So if a user has changed font-size in thier browser settings,
the ui should now react to that instead of for example html's computed font-size. So if user has a larger font-size the ui will count that as if on a larger monitor and "adapt" to it.
Same thing happens if you zoom in manually.
CI works and seem to run smooth.
On a "semi unrelated" note: I noticed that sometimes a merge can "load/stay pending" even if it is actually ready, just had to update page and send it.
Removed the "fake" unit test that was blog.test.ts, since all it did was mock getCollection and then assert the values manually handed to the mocked method where indeed the exact ones it was given a few lines above in the test file.
Fixed a security bug from earlier code.
Created 5 integration tests: layout, sitenav, blog-index, blog-routes and content. Explanation of what they do in next "episode"...
