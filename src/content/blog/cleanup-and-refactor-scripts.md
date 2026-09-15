---
title: "Make my documentation great again"
description: "I'll settle for it not lying about things..."
pubDate: 09-15-2026
tags: ["Django", "TDD", "ADR", "CLAUDE"]
---

Started off by going through the whole project to check for further inconsistencies that needed fixing.
Cleaned up, hopefully all, mentions of cart from early versions of my documentation.
It should now once and for all be consistent across all docs and files.

A colleague showed me these words: "Claude Code running autonomously overnight".
At first I thought it sounded too good to be true, but now here I am setting up a github CI with tests as a safeguard and/or frame of reference.
Not sure how this is gonna go in the end and I still need to make sure to write a proper prompt.
Ok, so the night-run skill is ready for a testrun, it should not push/merge to dev or master/main etc. So it should be more or less safe, especially considering I have a session limit on my current sub and a weekly. Worst case I have to work without claude on friday.
