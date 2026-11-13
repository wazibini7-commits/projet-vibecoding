// Configuration Prisma (remplace la section « prisma » de package.json, dépréciée).
import { defineConfig } from 'prisma/config'

// Avec ce fichier, Prisma ne lit plus .env tout seul : on le charge ici (fonction intégrée à Node).
try {
  process.loadEnvFile('.env')
} catch {
  // Pas de .env : les variables viennent de l'environnement (hébergeur, CI…).
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
