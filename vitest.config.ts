import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dir: './src/__tests__',
    exclude: ['e2e'],
    coverage: {
      provider: 'v8'
    },
  },
})