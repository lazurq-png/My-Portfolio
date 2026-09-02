import { defineConfig } from 'vitest/config'

// The dist/ output contract, kept in its own config because it needs a build to
// have run first -- it cannot join the suite that gates every push. Plain
// defineConfig: these tests only read files, so they need nothing from Astro's
// Vite pipeline.
//
// A second config file rather than a CLI --exclude override on the main one, for
// the reason ADR 0010 records: Vitest's exclude replaces rather than extends, and
// driving that from the command line is exactly how the scopes get tangled.
export default defineConfig({
  test: {
    dir: './src/__tests__/build',
  },
})
