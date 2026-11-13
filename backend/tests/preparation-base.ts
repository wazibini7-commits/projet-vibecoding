// Exécuté une fois avant tous les tests : crée la base vanlife_test si besoin et y applique les migrations.
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const URL_TEST = 'postgresql://vanlife:vanlife@localhost:5433/vanlife_test?schema=public'

export default async function preparer() {
  const url = process.env.DATABASE_URL_TEST ?? URL_TEST
  if (!/\/vanlife_test(\?|$)/.test(url)) {
    throw new Error(`Par sécurité, les tests ne s'exécutent que sur une base nommée « vanlife_test » (reçu : ${url}).`)
  }
  // migrate deploy crée la base si elle n'existe pas et n'applique que les migrations manquantes.
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' })
  const prisma = new PrismaClient({ datasourceUrl: url })
  await prisma.$queryRaw`SELECT 1`
  await prisma.$disconnect()
}
