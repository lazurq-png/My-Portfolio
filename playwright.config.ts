import { defineConfig, devices } from "@playwright/test";

// One explicit IPv4 address, on both the server and the tests. `localhost` resolves to
// both ::1 and 127.0.0.1, and Node binds the dev/preview server to just one of them
// (here ::1). Chromium retries the other family; Firefox sometimes does not, and fails
// a random test per run with NS_ERROR_CONNECTION_REFUSED. Pinning both ends removes it.
const HOST = "127.0.0.1";
const ORIGIN = `http://${HOST}:4321`;

export default defineConfig({
  testDir: "./src/__tests__/e2e",

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  // Left unset so Playwright uses its default (cores / 2). The suite is
  // read-only against a static site, so there is no shared state to serialize.
  // 'github' surfaces failures as inline PR annotations, so a CI failure is
  // readable without downloading the html report artifact.
  reporter: process.env.CI ? [["github"], ["list"], ["html"]] : "html",

  use: {
    baseURL: ORIGIN,
    trace: "on-first-retry",
    actionTimeout: 5000,
  },

  expect: {
    timeout: 5000,
  },

  timeout: 60000,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // Firefox needs more time than the global 5s budget under parallel
        // workers. Re-checked 2026-10-29 after the 127.0.0.1 fix: without these,
        // 1-3 of ~90 Firefox tests per run still timed out waiting for a page
        // after a click, against the dev server and the built site alike. The
        // failures were always navigation/visibility waits, never wrong content.
        actionTimeout: 60_000,
        navigationTimeout: 60_000,
      },
      // The action/navigation bumps above never covered expect(), so
      // visibility assertions need their own budget.
      expect: { timeout: 30_000 },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Keeps isMobile/hasTouch emulation, so a broken <meta name="viewport">
    // is still caught -- resizing alone would not catch it.
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    // CI serves the built dist/ -- the same bundle deployed to Cloudflare --
    // instead of paying dev-server compilation in every matrix leg.
    command: `${process.env.CI ? "pnpm preview" : "pnpm dev"} --host ${HOST}`,
    url: ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,

    // Astro 7 detects "agent" environments (Claude Code, Cursor, ...) via
    // am-i-vibing and silently runs `astro dev` detached:
    //   agentDetected = !process.env.ASTRO_DEV_BACKGROUND && isRunByAgent()
    // The command then returns immediately, so Playwright reports "webServer
    // exited early", and a server that did start outlives the run -- Playwright
    // never owned the detached grandchild, so neither Ctrl+C nor a clean exit
    // stops it. Any non-empty value opts out and keeps it in the foreground.
    env: { ASTRO_DEV_BACKGROUND: "1" },

    // Let the server shut itself down so it removes its lock file. A hard kill
    // leaves the lock behind, and the next run aborts with "Another astro dev
    // server is already running".
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
