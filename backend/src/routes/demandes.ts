import type { FastifyInstance } from 'fastify'
import { aujourdhuiIso } from '../../../src/utils/dates'
import { enregistrerDemande, estConflitUnicite, suivreDemande, type EntreeDemande } from '../services/demandes'
import type { OptionsApp } from '../app'

// Contrôle de FORME uniquement (types, longueurs extrêmes) ; les règles métier et leurs messages
// en français sont dans le service. Les champs inconnus sont ignorés.
const corpsDemande = {
  type: 'object',
  required: ['sejourId', 'prenom', 'email', 'dateDepart'],
  additionalProperties: false,
  properties: {
    sejourId: { type: 'string', maxLength: 100 },
    prenom: { type: 'string', maxLength: 500 },
    email: { type: 'string', maxLength: 500 },
    dateDepart: { type: 'string', maxLength: 50 },
    message: { type: 'string', maxLength: 5000 },
  },
} as const

const corpsSuivi = {
  type: 'object',
  required: ['reference', 'email'],
  additionalProperties: false,
  properties: {
    reference: { type: 'string', minLength: 1, maxLength: 50 },
    email: { type: 'string', minLength: 1, maxLength: 500 },
  },
} as const

export async function routesDemandes(app: FastifyInstance, { prisma, horloge, limiteDemandesParMinute, emails }: OptionsApp) {
  app.post<{ Body: EntreeDemande }>(
    '/api/demandes',
    { schema: { body: corpsDemande }, config: { rateLimit: { max: limiteDemandesParMinute, timeWindow: '1 minute' } } },
    async (req, rep) => {
      const enregistrer = () => {
        const maintenant = horloge()
        return enregistrerDemande(prisma, req.body, maintenant, aujourdhuiIso(maintenant), { emailEquipe: emails.equipe })
      }
      let resultat
      try {
        resultat = await enregistrer()
      } catch (e) {
        // Rare : deux premières demandes simultanées avec le même e-mail. Une seconde tentative suffit.
        if (!estConflitUnicite(e)) throw e
        resultat = await enregistrer()
      }
      switch (resultat.type) {
        case 'ok':
          emails.declencherEnvoi() // accusé de réception et notification partent tout de suite
          return rep.code(201).send(resultat.demande)
        case 'sejour-inconnu': return rep.code(404).send({ message: 'Séjour introuvable.' })
        case 'invalide': return rep.code(400).send({ erreurs: resultat.erreurs })
        case 'conflit': return rep.code(409).send({ erreurs: resultat.erreurs })
      }
    },
  )

  // POST (et non GET ?email=…) : l'adresse e-mail n'apparaît ni dans l'URL, ni dans les journaux du serveur.
  app.post<{ Body: { reference: string; email: string } }>(
    '/api/demandes/suivi',
    { schema: { body: corpsSuivi }, config: { rateLimit: { max: limiteDemandesParMinute * 3, timeWindow: '1 minute' } } },
    async (req, rep) => {
      const suivi = await suivreDemande(prisma, req.body.reference, req.body.email)
      if (!suivi) {
        return rep.code(404).send({ message: 'Aucune demande ne correspond à cette référence et cette adresse e-mail.' })
      }
      return suivi
    },
  )
}
