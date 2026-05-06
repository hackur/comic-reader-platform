import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    name: 'comic-core',
    include: ['test/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: [
      ['test/comic-info.test.ts', 'happy-dom'],
      ['test/format-detect.fixture.test.ts', 'happy-dom'],
    ],
  },
  resolve: {
    alias: {
      '@fixtures': resolve(here, '../../tests/fixtures/loader.ts'),
    },
  },
})
