---
title: "Playwright tests"
description: "Finishing playwright tests, hopefully"
pubDate: 08-20-2026
tags: ["astro", "Testing", "Playwright"]
---

Started day with new concepts E2E and revisiting old knowledge.
Since at first having playwright start the dev server and run tests against did not work,
I kind of abandoned the idea and ran my own test server. Which was of course very wrong,
since playwright launches each browser as a seperate worker and runs tests in parallel.
Now with adding the correct use script in the config file, tests seem to finally work without
randomly failing for one or other browsers.
Need to be careful with prompting AI.
chatGPT added duplicate tests from project and blog page inside of index.spec.ts.
Which created quite a headache when running tests that also failed cause of hardcoded data,
like how many blog posts should show.
10 when test was made, but that was before this post was made :)
Changing from 4 workers to 1, made all tests pass. and it doesn't even seem that much slower.
Also time management is something I need to get better at...
