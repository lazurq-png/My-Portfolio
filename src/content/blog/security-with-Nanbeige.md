---
title: "Security with Nanbeige AI"
description: "Documenting decisions made by the AI and understanding why these risks are risks."
pubDate: 08-13-2026
tags: ["astro", "Security", "AI", "Documentation"]
---

Using a local version of the open source AI model Nanbeige4.2 3B I ran the following prompt:
"audit the entire codebase and analyze the security flaws and summarize for me".
Without going into detail here, there were some issues that the AI found and also gave me implementations for how to fix.

Concepts from the bossman himself:
Treeshaking = shake a tree and pick out what you need. (Another way of saying: Import what you need and not whole libraries I assume)
ADR (Architecture Decision Record) = document design decisions in a clear and consise manner, specifying the why for a technology.
Also learned how to structure and place ADR inside a project.
