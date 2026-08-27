---
title: "CI/CD"
description: "Adding CI pipeline via github action and workflow file."
pubDate: 08-25-2026
tags: ["CI/CD", "Portfolio"]
---

Created a workflow file and commited it to the repo.
Should run Vitest unit tests and Playwright e2e tests,
whenever I now push/merge with master/main.
Should probably have specified that I was using master instead of main.
Take 2!
Some tests on safari failed in CI, because it is running headless.
Trying to install webkit dependencies to make them pass.
Trying again, this time with installs for webkit in e2e job instead of unti tests.
