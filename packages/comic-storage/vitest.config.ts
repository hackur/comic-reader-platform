import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'comic-storage',
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
