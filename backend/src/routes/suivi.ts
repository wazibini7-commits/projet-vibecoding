// Espace client : /api/suivi/…
// Toutes les adresses sont en POST : le lien personnel (secret) voyage dans le corps de la requête,
// jamais dans l'URL — il n'apparaît donc ni dans les journaux du serveur, ni dans l'historique.
import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  MESSAGE_LIEN_ENVOYE, MESSAGE_SUIVI_LONGUEUR_MAX, MOTIF_ANNULATION_LONGUEUR_MAX, type AccesSuivi,
} from '../../../src/domain/suivi'
import { annulerParClient, demanderLien, envoyerMessageClient, lireSuivi, type ResultatActionClient } from '../services/suivi'
import type { OptionsApp } from '../app'

const LIEN_INVALIDE = {
  message: "Ce lien de suivi n'est pas valide ou a expiré. Demandez-en un nouveau avec votre référence et votre adresse e-mail.",
}

const proprietesAcces = {
  reference: { type: 'string', minLength: 1, maxLength: 50 },
  jeton: { type: 'string', minLength: 1, maxLength: 100 },
} as const

const corps = (proprietes: object, requis: string[]) =>
  ({ type: 'object', additionalProperties: false, required: requis, properties: proprietes }) as const

export async function routesSuivi(app: FastifyInstance, options: OptionsApp) {
  const { prisma, horloge } = options
  const reglages = { emailEquipe: options.emails.equipe, siteUrl: options.siteUrl }
  const limite = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } })

  function repondre(rep: FastifyReply, r: ResultatActionClient) {
    switch (r.type) {
      case 'ok': options.emails.declencherEnvoi(); return r.suivi
      case 'acces-refuse': return rep.code(404).send(LIEN_INVALIDE)
      case 'invalide': return rep.code(400).send({ message: r.message })
      case 'impossible': return rep.code(409).send({ message: r.message })
    }
  }

  app.post<{ Body: AccesSuivi }>(
    '/api/suivi',
    { schema: { body: corps(proprietesAcces, ['reference', 'jeton']) }, config: limite(30) },
    async (req, rep) => (await lireSuivi(prisma, req.body, horloge())) ?? rep.code(404).send(LIEN_INVALIDE),
  )

  // Lien perdu : un nouveau lien est envoyé par e-mail. Réponse IDENTIQUE dans tous les cas.
  app.post<{ Body: { reference: string; email: string } }>(
    '/api/suivi/lien',
    {
      schema: {
        body: corps({ reference: { type: 'string', maxLength: 50 }, email: { type: 'string', maxLength: 320 } }, ['reference', 'email']),
      },
      config: limite(options.limiteDemandesParMinute),
    },
    async (req, rep) => {
      if (await demanderLien(prisma, req.body.reference, req.body.email, horloge(), reglages)) options.emails.declencherEnvoi()
      return rep.code(202).send({ message: MESSAGE_LIEN_ENVOYE })
    },
  )

  app.post<{ Body: AccesSuivi & { motif?: string } }>(
    '/api/suivi/annuler',
    {
      schema: { body: corps({ ...proprietesAcces, motif: { type: 'string', maxLength: MOTIF_ANNULATION_LONGUEUR_MAX * 2 } }, ['reference', 'jeton']) },
      config: limite(options.limiteDemandesParMinute),
    },
    async (req, rep) => repondre(rep, await annulerParClient(prisma, req.body, req.body.motif, horloge(), reglages)),
  )

  app.post<{ Body: AccesSuivi & { texte: string } }>(
    '/api/suivi/messages',
    {
      schema: { body: corps({ ...proprietesAcces, texte: { type: 'string', maxLength: MESSAGE_SUIVI_LONGUEUR_MAX * 2 } }, ['reference', 'jeton', 'texte']) },
      config: limite(options.limiteDemandesParMinute),
    },
    async (req, rep) => repondre(rep, await envoyerMessageClient(prisma, req.body, req.body.texte, horloge(), reglages)),
  )
}
