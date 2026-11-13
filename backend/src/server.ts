// Démarrage du serveur : npm run dev (rechargement automatique) ou npm start.
import { config } from './config' // en premier : charge .env
import { PrismaClient } from '@prisma/client'
import { construireApp } from './app'

const prisma = new PrismaClient()
const app = await construireApp({
  prisma,
  horloge: () => new Date(),
  originesAutorisees: config.originesAutorisees,
  limiteDemandesParMinute: 10,
  journal: { level: config.niveauJournal },
})

async function arreter() {
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', arreter)
process.on('SIGTERM', arreter)

await app.listen({ port: config.port, host: config.hote })
