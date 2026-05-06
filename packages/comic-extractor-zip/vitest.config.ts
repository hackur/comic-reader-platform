import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    name: 'comic-extractor-zip',
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@fixtures': resolve(here, '../../tests/fixtures/loader.ts'),
    },
  },
})
