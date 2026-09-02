import { getViteConfig } from 'astro/config'
import { configDefaults, coverageConfigDefaults } from 'vitest/config'

// getViteConfig, not vitest/config's defineConfig: it resolves astro.config.mjs
// and runs the integration hooks, which is what makes `.astro` imports and the
// `astro:content` virtual module resolve inside the integration tests. See ADR 0015.
export default getViteConfig({
  test: {
    dir: './src/__tests__',
    // Spread the defaults rather than replacing them -- `exclude` overwrites
    // rather than extends, so the bare ['e2e'] this used to be silently dropped
    // the built-in node_modules/dist exclusions. ADR 0010 flagged that as a trap.
    exclude: [...configDefaults.exclude, '**/e2e/**', '**/build/**'],
    coverage: {
      provider: 'v8',
      // The integration tests import .astro pages, which pull the Markdown posts
      // in with them. They are content, not code -- left in, seventeen posts sit
      // in the report at ~38% and bury the numbers that mean something.
      exclude: [...coverageConfigDefaults.exclude, 'src/content/**', '*.config.*'],
    },
  },
})
