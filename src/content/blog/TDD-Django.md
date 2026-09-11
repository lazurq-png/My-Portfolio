---
title: "TDD with me and Django"
description: "3, 2, 1, Django!"
pubDate: 09-11-2026
tags: ["Django", "TDD"]
---

Created a shop template using official django docs, then instead of using their tutorials I used claudes learning module.
After some very brief prompting, I now have a clear and easy path to follow for trying out TDD with django.
So far created a few tests for "add to cart" and "view candy list".

Since lately this project is only pushing blog posts, I have added rules to not run e2e tests every single time a new blog file gets pushed and then PR:ed into master.
Final check to see if CI does not run extra tests now after new action files are on git.
