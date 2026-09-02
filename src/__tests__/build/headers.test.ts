import { describe, test, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { SECURITY_HEADERS } from "../../lib/headers";

/**
 * Asserts the security policy reaches the artifact that is actually deployed.
 *
 * This exists because the previous mechanism did not. The policy was declared as
 * a top-level `headers` array in astro.config.mjs, which is not an Astro config
 * option -- it was stripped by the config schema, no file was written, and the
 * site was served with no CSP at all for as long as that config stood. Nothing
 * caught it, because nothing looked at the build output. See ADR 0014.
 *
 * Requires `pnpm build` first; run via `pnpm test:build`.
 */
describe("dist/_headers", () => {
  let contents: string;
  let lines: string[];

  beforeAll(async () => {
    try {
      contents = await readFile("dist/_headers", "utf8");
    } catch {
      throw new Error(
        "dist/_headers is missing. Run `pnpm build` before `pnpm test:build`.",
      );
    }
    lines = contents.split("\n");
  });

  test("applies its rule to every path", () => {
    expect(lines[0]).toBe("/*");
  });

  test.each(SECURITY_HEADERS)("ships %s", (name, value) => {
    // Two spaces of indentation is what makes a line part of the preceding
    // path rule -- an unindented line would silently start a new rule.
    expect(lines).toContain(`  ${name}: ${value}`);
  });

  test("ships no header that is not in the policy", () => {
    const emitted = lines
      .filter((line) => line.startsWith("  "))
      .map((line) => line.slice(2).split(":")[0]);

    expect(emitted).toEqual(SECURITY_HEADERS.map(([name]) => name));
  });

  test("keeps the CSP a strict allowlist", () => {
    const csp = lines.find((line) =>
      line.startsWith("  Content-Security-Policy:"),
    );

    // The four directives ADR 0006 calls the point of the policy: anything new
    // and external has to break at runtime until the policy is widened on purpose.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });
});
