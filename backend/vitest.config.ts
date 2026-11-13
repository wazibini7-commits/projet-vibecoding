import { defineConfig } from 'vitest/config'

// Les tests utilisent une base SÉPARÉE (vanlife_test), recréée à chaque lancement.
// Elle ne touche jamais la base de développement « vanlife ».
const URL_BASE_TEST =
  process.env.DATABASE_URL_TEST ?? 'postgresql://vanlife:vanlife@localhost:5433/vanlife_test?schema=public'

export default defineConfig({
  test: {
    env: { DATABASE_URL: URL_BASE_TEST },
    globalSetup: ['tests/preparation-base.ts'],
    fileParallelism: false, // tous les fichiers partagent la même base de test
    testTimeout: 15_000,
  },
})
