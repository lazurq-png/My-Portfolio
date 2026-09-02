import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  // Left unset so Playwright uses its default (cores / 2). The suite is
  // read-only against a static site, so there is no shared state to serialize.
  // 'github' surfaces failures as inline PR annotations, so a CI failure is
  // readable without downloading the html report artifact.
  reporter: process.env.CI ? [['github'], ['list'], ['html']] : 'html',

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    actionTimeout: 5000,
  },

  expect: {
    timeout: 5000,
  },

  timeout: 60000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'],
        // added more time for firefox since it needs it.
        actionTimeout: 60_000,
        navigationTimeout: 60_000, },
      // The action/navigation bumps above never covered expect(), so
      // visibility assertions still flaked against the global 5s budget
      // once the suite started running workers in parallel.
      expect: { timeout: 30_000 },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Keeps isMobile/hasTouch emulation, so a broken <meta name="viewport">
    // is still caught -- resizing alone would not catch it.
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    // CI serves the built dist/ -- the same bundle deployed to Cloudflare --
    // instead of paying dev-server compilation in every matrix leg.
    command: process.env.CI ? 'pnpm preview' : 'pnpm dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,

    // Astro 7 detects "agent" environments (Claude Code, Cursor, ...) via
    // am-i-vibing and silently runs `astro dev` detached:
    //   agentDetected = !process.env.ASTRO_DEV_BACKGROUND && isRunByAgent()
    // The command then returns immediately, so Playwright reports "webServer
    // exited early", and a server that did start outlives the run -- Playwright
    // never owned the detached grandchild, so neither Ctrl+C nor a clean exit
    // stops it. Any non-empty value opts out and keeps it in the foreground.
    env: { ASTRO_DEV_BACKGROUND: '1' },

    // Let the server shut itself down so it removes its lock file. A hard kill
    // leaves the lock behind, and the next run aborts with "Another astro dev
    // server is already running".
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
