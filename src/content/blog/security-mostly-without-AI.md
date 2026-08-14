---
title: "Security mostly without AI"
description: "Cleaning up code left over by half done AI prompts and implementing fixes left from yesterday."
pubDate: 08-14-2026
tags: ["astro", "Security", "Documentation"]
---

Using the output from yesterdays prompts, I can still implement mentioned fixes by hand.
Not going into detail, for obvious reasons, but I did look at the security implementations added in config file and understand what is being done to a great degree. But mostly it is rules that don't allow resources from outside of the website itself and block certain scripts and/or common hacking techniques.
Since I have no plans to let outside users create blog posts however, I think some of the rules may be unused fluff. I guess I could view it as protection against myself, if nothing else.
Removed the Welcome.astro file, since it was not used in any way from what I can tell.
