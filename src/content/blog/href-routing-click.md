---
title: "Making interface more interactive"
description: "Skill icons -> docs, blog posts -> the post etc"
pubDate: 08-10-2026
tags: ["astro", "portfolio"]
---

Added a link: "link to docs" prop to each item in the iconStack and swapped "span" to "a".
Then all I had to do was add href={item.link} as an inline.
Did the same for project page with links to actual project instead of templates.
Not sure if creating anchor elements for this is better than using eventhandlers, functions and buttons.
