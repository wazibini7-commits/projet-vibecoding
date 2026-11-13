// Démarrage du serveur : npm run dev (rechargement automatique) ou npm start.
import { config } from './config' // en premier : charge .env
import { PrismaClient } from '@prisma/client'
import { construireApp } from './app'
import { demarrerFileEmails, reprendreEmailsInterrompus, type FileEmails } from './emails/file'
import { creerTransportSmtp } from './emails/transportSmtp'

const prisma = new PrismaClient()
let fileEmails: FileEmails | undefined

const app = await construireApp({
  prisma,
  horloge: () => new Date(),
  originesAutorisees: config.originesAutorisees,
  cookieSecurise: config.cookieSecurise,
  siteUrl: config.siteUrl,
  limiteDemandesParMinute: 10,
  limiteConnexionsParMinute: 5,
  journal: { level: config.niveauJournal },
  emails: { equipe: config.emails.equipe, declencherEnvoi: () => fileEmails?.declencher() },
})

// Envoi des e-mails en arrière-plan (file d'attente en base, nouveaux essais en cas de panne).
const repris = await reprendreEmailsInterrompus(prisma)
if (repris) app.log.warn({ repris }, 'e-mails interrompus remis dans la file')
fileEmails = demarrerFileEmails({
  prisma,
  transport: creerTransportSmtp(config.emails.smtp),
  expediteur: config.emails.expediteur,
  intervalleMs: config.emails.intervalleMs,
  journal: app.log,
})
app.log.info(`e-mails envoyés par SMTP ${config.emails.smtp.hote}:${config.emails.smtp.port}` +
  (config.emails.smtp.port === 1025 ? ' (Mailpit : http://localhost:8025)' : ''))

async function arreter() {
  await app.close()
  await fileEmails?.arreter()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', arreter)
process.on('SIGTERM', arreter)

await app.listen({ port: config.port, host: config.hote })
