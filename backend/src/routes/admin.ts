// API du back-office : /api/admin/…
// Sécurité :
//  - session dans un cookie httpOnly (inaccessible au JavaScript), SameSite=Strict ;
//  - toute requête qui modifie quelque chose doit venir du site Vanlife (en-tête Origin vérifié) ;
//  - connexion limitée à quelques essais par minute et par adresse IP (5 en production) ;
//  - gestion des départs réservée aux administrateurs.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  NOTE_LONGUEUR_MAX, STATUTS,
  type ChangementStatut, type FiltresDemandes, type ModificationDepart, type NouveauDepart, type Role,
  type UtilisateurConnecte,
} from '../../../src/domain/admin'
import type { StatutDemande } from '../../../src/domain/types'
import { aujourdhuiIso } from '../../../src/utils/dates'
import {
  DUREE_SESSION_MS, authentifier, erreurMotDePasse, fermerAutresSessions, fermerSession, hacherMotDePasse,
  lireSession, ouvrirSession, verifierMotDePasse,
} from '../auth/securite'
import { changerStatut, exporterCsv, listerDemandes, lireDemande, modifierNote } from '../services/admin/demandes'
import { creerDepart, listerDepartsAdmin, modifierDepart } from '../services/admin/departs'
import type { OptionsApp } from '../app'

export const COOKIE_SESSION = 'vanlife_session'

declare module 'fastify' {
  interface FastifyRequest {
    utilisateur?: UtilisateurConnecte
    jetonSession?: string
  }
}

const NON_CONNECTE = { message: 'Vous devez vous connecter.' }

// ---------- Schémas (forme des requêtes) ----------

const corpsConnexion = {
  type: 'object', required: ['email', 'motDePasse'], additionalProperties: false,
  properties: { email: { type: 'string', maxLength: 320 }, motDePasse: { type: 'string', maxLength: 200 } },
} as const

const corpsMotDePasse = {
  type: 'object', required: ['actuel', 'nouveau'], additionalProperties: false,
  properties: { actuel: { type: 'string', maxLength: 200 }, nouveau: { type: 'string', maxLength: 500 } },
} as const

const filtresDemandes = {
  type: 'object', additionalProperties: false,
  properties: {
    statut: { type: 'string', enum: STATUTS },
    recherche: { type: 'string', maxLength: 100 },
    page: { type: 'string', pattern: '^[1-9][0-9]{0,4}$' },
  },
} as const

const parametreReference = {
  type: 'object', required: ['reference'],
  properties: { reference: { type: 'string', maxLength: 50 } },
} as const

const corpsStatut = {
  type: 'object', required: ['statut', 'informerClient'], additionalProperties: false,
  properties: {
    statut: { type: 'string', enum: STATUTS },
    commentaire: { type: 'string', maxLength: 5000 },
    informerClient: { type: 'boolean' },
  },
} as const

const corpsNote = {
  type: 'object', required: ['noteInterne'], additionalProperties: false,
  properties: { noteInterne: { type: 'string', maxLength: NOTE_LONGUEUR_MAX * 2 } },
} as const

const corpsNouveauDepart = {
  type: 'object', required: ['sejourId', 'date', 'capacite'], additionalProperties: false,
  properties: { sejourId: { type: 'string', maxLength: 100 }, date: { type: 'string', maxLength: 10 }, capacite: { type: 'integer' } },
} as const

const corpsModifDepart = {
  type: 'object', additionalProperties: false, minProperties: 1,
  properties: { capacite: { type: 'integer' }, statut: { type: 'string', enum: ['OUVERT', 'COMPLET', 'FERME'] } },
} as const

type Filtres = { statut?: StatutDemande; recherche?: string; page?: string }
const versFiltres = (q: Filtres): FiltresDemandes => ({ statut: q.statut, recherche: q.recherche, page: q.page ? Number(q.page) : 1 })

export async function routesAdmin(app: FastifyInstance, options: OptionsApp) {
  const { prisma, horloge, originesAutorisees, cookieSecurise, limiteConnexionsParMinute } = options

  const poserCookie = (rep: FastifyReply, jeton: string) =>
    rep.setCookie(COOKIE_SESSION, jeton, {
      path: '/api', httpOnly: true, sameSite: 'strict', secure: cookieSecurise, maxAge: DUREE_SESSION_MS / 1000,
    })
  const effacerCookie = (rep: FastifyReply) =>
    rep.clearCookie(COOKIE_SESSION, { path: '/api', httpOnly: true, sameSite: 'strict', secure: cookieSecurise })

  // Anti-falsification (CSRF) : une requête qui modifie quelque chose doit venir du site Vanlife.
  app.addHook('onRequest', async (req, rep) => {
    if (req.method === 'GET' || req.method === 'HEAD') return
    const origine = req.headers.origin
    if (!origine || !originesAutorisees.includes(origine)) {
      return rep.code(403).send({ message: 'Requête refusée : origine non autorisée.' })
    }
  })

  // Fournit req.utilisateur si une session valide est présente (avant toute validation de la requête :
  // un visiteur non connecté reçoit 401 sans rien apprendre du format attendu).
  app.addHook('onRequest', async (req) => {
    const jeton = req.cookies[COOKIE_SESSION]
    if (!jeton) return
    const utilisateur = await lireSession(prisma, jeton, horloge())
    if (utilisateur) {
      req.utilisateur = utilisateur
      req.jetonSession = jeton
    }
  })

  const exigerConnexion = async (req: FastifyRequest, rep: FastifyReply) => {
    if (!req.utilisateur) {
      effacerCookie(rep)
      return rep.code(401).send(NON_CONNECTE)
    }
  }
  const exigerRole = (role: Role) => async (req: FastifyRequest, rep: FastifyReply) => {
    if (req.utilisateur?.role !== role) return rep.code(403).send({ message: 'Action réservée aux administrateurs.' })
  }
  const connecte = { onRequest: exigerConnexion }
  const admin = { onRequest: [exigerConnexion, exigerRole('ADMIN')] }

  // ---------- Connexion ----------

  app.post<{ Body: { email: string; motDePasse: string } }>(
    '/api/admin/connexion',
    { schema: { body: corpsConnexion }, config: { rateLimit: { max: limiteConnexionsParMinute, timeWindow: '1 minute' } } },
    async (req, rep) => {
      const utilisateur = await authentifier(prisma, req.body.email, req.body.motDePasse)
      if (!utilisateur) return rep.code(401).send({ message: 'Adresse e-mail ou mot de passe incorrect.' })
      const maintenant = horloge()
      const jeton = await ouvrirSession(prisma, utilisateur.id, maintenant)
      await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { derniereConnexion: maintenant } })
      poserCookie(rep, jeton)
      const { id, email, nom, role } = utilisateur
      return { id, email, nom, role } satisfies UtilisateurConnecte
    },
  )

  app.post('/api/admin/deconnexion', async (req, rep) => {
    if (req.jetonSession) await fermerSession(prisma, req.jetonSession)
    effacerCookie(rep)
    return rep.code(204).send()
  })

  app.get('/api/admin/moi', connecte, async (req) => req.utilisateur)

  app.post<{ Body: { actuel: string; nouveau: string } }>(
    '/api/admin/mot-de-passe',
    { ...connecte, schema: { body: corpsMotDePasse }, config: { rateLimit: { max: limiteConnexionsParMinute, timeWindow: '1 minute' } } },
    async (req, rep) => {
      const u = await prisma.utilisateur.findUniqueOrThrow({ where: { id: req.utilisateur!.id } })
      if (!(await verifierMotDePasse(u.motDePasseHash, req.body.actuel))) {
        return rep.code(400).send({ erreurs: { actuel: 'Le mot de passe actuel est incorrect.' } })
      }
      const erreur = erreurMotDePasse(req.body.nouveau)
      if (erreur) return rep.code(400).send({ erreurs: { nouveau: erreur } })
      await prisma.utilisateur.update({ where: { id: u.id }, data: { motDePasseHash: await hacherMotDePasse(req.body.nouveau) } })
      await fermerAutresSessions(prisma, u.id, req.jetonSession) // déconnecte les autres appareils
      return rep.code(204).send()
    },
  )

  // ---------- Demandes ----------

  app.get<{ Querystring: Filtres }>('/api/admin/demandes', { ...connecte, schema: { querystring: filtresDemandes } },
    async (req) => listerDemandes(prisma, versFiltres(req.query)))

  app.get<{ Querystring: Filtres }>('/api/admin/demandes/export.csv', { ...connecte, schema: { querystring: filtresDemandes } },
    async (req, rep) => {
      const csv = await exporterCsv(prisma, versFiltres(req.query))
      return rep
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="demandes-vanlife-${aujourdhuiIso(horloge())}.csv"`)
        .header('Cache-Control', 'no-store')
        .send(csv)
    })

  app.get<{ Params: { reference: string } }>('/api/admin/demandes/:reference', { ...connecte, schema: { params: parametreReference } },
    async (req, rep) => (await lireDemande(prisma, req.params.reference)) ?? rep.code(404).send({ message: 'Demande introuvable.' }))

  app.post<{ Params: { reference: string }; Body: ChangementStatut }>(
    '/api/admin/demandes/:reference/statut',
    { ...connecte, schema: { params: parametreReference, body: corpsStatut } },
    async (req, rep) => {
      const r = await changerStatut(prisma, req.params.reference, req.body, req.utilisateur!, horloge())
      switch (r.type) {
        case 'ok':
          if (r.emailEnFile) options.emails.declencherEnvoi()
          req.log.info({ reference: req.params.reference, statut: req.body.statut, auteur: req.utilisateur!.id }, 'statut de demande modifié')
          return r.demande
        case 'introuvable': return rep.code(404).send({ message: 'Demande introuvable.' })
        case 'invalide': return rep.code(400).send({ message: r.message })
        case 'conflit': return rep.code(409).send({ message: r.message })
      }
    },
  )

  app.put<{ Params: { reference: string }; Body: { noteInterne: string } }>(
    '/api/admin/demandes/:reference/note',
    { ...connecte, schema: { params: parametreReference, body: corpsNote } },
    async (req, rep) => {
      const r = await modifierNote(prisma, req.params.reference, req.body.noteInterne)
      if (r === 'introuvable') return rep.code(404).send({ message: 'Demande introuvable.' })
      if (r === 'trop-longue') return rep.code(400).send({ message: `La note ne doit pas dépasser ${NOTE_LONGUEUR_MAX} caractères.` })
      return lireDemande(prisma, req.params.reference)
    },
  )

  // ---------- Départs (administrateurs) ----------

  app.get<{ Params: { sejourId: string } }>('/api/admin/sejours/:sejourId/departs', connecte, async (req, rep) =>
    (await listerDepartsAdmin(prisma, req.params.sejourId, aujourdhuiIso(horloge())))
      ?? rep.code(404).send({ message: 'Séjour introuvable.' }))

  app.post<{ Body: NouveauDepart }>('/api/admin/departs', { ...admin, schema: { body: corpsNouveauDepart } }, async (req, rep) => {
    const r = await creerDepart(prisma, req.body, aujourdhuiIso(horloge()))
    if (r.type === 'introuvable') return rep.code(404).send({ message: 'Séjour introuvable.' })
    if (r.type === 'invalide') return rep.code(400).send({ message: r.message })
    return rep.code(201).send(r.depart)
  })

  app.patch<{ Params: { id: string }; Body: ModificationDepart }>(
    '/api/admin/departs/:id',
    {
      ...admin,
      schema: { params: { type: 'object', properties: { id: { type: 'string', pattern: '^[0-9]{1,9}$' } } }, body: corpsModifDepart },
    },
    async (req, rep) => {
      const r = await modifierDepart(prisma, Number(req.params.id), req.body)
      if (r.type === 'introuvable') return rep.code(404).send({ message: 'Départ introuvable.' })
      if (r.type === 'invalide') return rep.code(400).send({ message: r.message })
      return r.depart
    },
  )
}

