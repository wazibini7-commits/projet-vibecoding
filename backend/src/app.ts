// Construction de l'application Fastify, séparée du démarrage (server.ts)
// pour pouvoir la tester sans ouvrir de port réseau.
import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import type { PrismaClient } from '@prisma/client'
import { routesSejours } from './routes/sejours'
import { routesDemandes } from './routes/demandes'
import { routesAdmin } from './routes/admin'
import { routesSuivi } from './routes/suivi'

export interface OptionsApp {
  prisma: PrismaClient
  /** Heure courante — injectable pour que les tests ne dépendent pas du calendrier. */
  horloge: () => Date
  originesAutorisees: string[]
  /** Adresse publique du site (liens « Suivre ma demande » dans les e-mails), ex. https://vanlife.bzh */
  siteUrl: string
  /** Cookie de session réservé au HTTPS (vrai en production). */
  cookieSecurise: boolean
  /** Nombre maximal de demandes envoyées par minute depuis une même adresse IP (anti-spam). */
  limiteDemandesParMinute: number
  /** Essais de connexion au back-office par minute et par adresse IP (contre les essais de mots de passe en série). */
  limiteConnexionsParMinute: number
  emails: {
    /** Adresse de l'équipe Vanlife (notification de nouvelle demande). */
    equipe: string
    /** Demande un envoi immédiat de la file des e-mails (sans attendre le passage régulier). */
    declencherEnvoi: () => void
  }
  journal?: FastifyServerOptions['logger']
}

export async function construireApp(options: OptionsApp) {
  const app = Fastify({
    logger: options.journal ?? false,
    // Les règles de forme refusent (au lieu de convertir) une valeur du mauvais type.
    ajv: { customOptions: { coerceTypes: false } },
  })

  await app.register(helmet)
  await app.register(cors, {
    origin: options.originesAutorisees,
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    credentials: true, // cookie de session du back-office
  })
  await app.register(cookie)
  await app.register(rateLimit, { global: false })

  // Requête mal formée (JSON illisible, champ manquant, mauvais type) : réponse courte en français.
  app.setErrorHandler<FastifyError>((erreur, req, rep) => {
    if (erreur.validation || erreur.statusCode === 400 || erreur.statusCode === 415) {
      return rep.code(400).send({ message: 'Requête invalide.' })
    }
    if (erreur.statusCode === 429) {
      return rep.code(429).send({ message: 'Trop de demandes envoyées. Réessayez dans une minute.' })
    }
    req.log.error(erreur)
    return rep.code(500).send({ message: 'Erreur interne du serveur. Réessayez plus tard.' })
  })
  app.setNotFoundHandler((_req, rep) => rep.code(404).send({ message: 'Adresse inconnue.' }))

  app.get('/api/sante', async (_req, rep) => {
    try {
      await options.prisma.$queryRaw`SELECT 1`
      return { statut: 'ok', baseDeDonnees: 'ok' }
    } catch {
      return rep.code(503).send({ statut: 'degrade', baseDeDonnees: 'injoignable' })
    }
  })

  await app.register(routesSejours, options)
  await app.register(routesDemandes, options)
  await app.register(routesSuivi, options)
  await app.register(routesAdmin, options)
  return app
}
