---
title: "Linter vs astro check"
description: "Final finalize? surely."
pubDate: 09-04-2026
tags: ["Astro", "AI", "Portfolio"]
---

Was about to add a linter, but astro check seems to do a better job.
I had to pin TypeScript to 6.0.3, since astro check needs it.
I have also realized the need to go through and proof-read all documentation, since claude uses it to base new decisions on.
So my friday "entertainment" is saved, lucky me :).
Found a "bug" in the adr for cloudflare, apparently claude couldn't view past the wrangler file and assumed I was manually deploying to cloudflare. Should be fixed now. I do feel like I have way too many adr files for quite things that are not even decisions, but things that should just always exist in a project.
For example: testing, at least in my mind, is something that you don't really choose. It should always be there.
