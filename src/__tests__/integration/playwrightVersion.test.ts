import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/**
 * The e2e job runs in the mcr.microsoft.com/playwright container, which ships the
 * browser builds for exactly one Playwright version. A different @playwright/test
 * looks for browsers the image does not have, and every e2e leg fails to launch.
 *
 * Dependabot bumps the package but never the `container:` image, so this runs in
 * the push and PR unit jobs -- a Playwright bump fails here, with the fix in the
 * message, before the e2e matrix gets the chance to fail obscurely.
 */
describe("Playwright container", () => {
  test("ci-pull.yml uses the image for the installed @playwright/test", () => {
    const workflow = readFileSync(".github/workflows/ci-pull.yml", "utf8");
    const tag = /mcr\.microsoft\.com\/playwright:v([\d.]+)-/.exec(workflow)?.[1];
    const installed = JSON.parse(
      readFileSync("node_modules/@playwright/test/package.json", "utf8"),
    ).version;

    expect(tag, "no mcr.microsoft.com/playwright image found in ci-pull.yml").toBeDefined();
    expect(
      tag,
      `set the e2e container image in ci-pull.yml to mcr.microsoft.com/playwright:v${installed}-noble`,
    ).toBe(installed);
  });
});
