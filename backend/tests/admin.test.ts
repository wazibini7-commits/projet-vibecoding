import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance, InjectOptions } from 'fastify'
import { hacherMotDePasse } from '../src/auth/securite'
import { celluleCsv } from '../src/services/admin/demandes'
import { COOKIE_SESSION } from '../src/routes/admin'
import { creerApp, creerSejour, DEMANDE_VALIDE, ORIGINE, prisma, viderBase } from './outils'

const MOT_DE_PASSE = 'un mot de passe solide'
let empreinte: string
let app: FastifyInstance
const declencherEnvoi = vi.fn()

beforeAll(async () => {
  empreinte = await hacherMotDePasse(MOT_DE_PASSE)
  app = await creerApp({ declencherEnvoi })
})
afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})
beforeEach(async () => {
  await viderBase()
  declencherEnvoi.mockClear()
  await creerSejour([{ date: '2027-05-15', capacite: 2 }, { date: '2027-06-12', capacite: 1 }])
})

async function creerCompte(email = 'claire@vanlife.example', role: 'ADMIN' | 'GESTIONNAIRE' = 'ADMIN') {
  return prisma.utilisateur.create({ data: { email, nom: 'Claire Martin', role, motDePasseHash: empreinte } })
}

/** Requête avec l'origine du site (exigée pour toute modification). */
const requete = (o: InjectOptions) => {
  // Un en-tête passé à undefined est retiré (requête sans en-tête Origin).
  const entetes = Object.fromEntries(Object.entries({ origin: ORIGINE, ...o.headers }).filter(([, v]) => v !== undefined))
  return app.inject({ ...o, headers: entetes })
}

async function connecter(email = 'claire@vanlife.example', role: 'ADMIN' | 'GESTIONNAIRE' = 'ADMIN') {
  await creerCompte(email, role)
  const rep = await requete({ method: 'POST', url: '/api/admin/connexion', payload: { email, motDePasse: MOT_DE_PASSE } })
  const jeton = rep.cookies.find((c) => c.name === COOKIE_SESSION)!.value
  return (o: InjectOptions) => requete({ ...o, cookies: { [COOKIE_SESSION]: jeton } })
}

async function nouvelleDemande(email = 'camille@exemple.fr', dateDepart = '2027-05-15') {
  const rep = await app.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, email, dateDepart } })
  return rep.json().reference as string
}

describe('connexion', () => {
  it('bons identifiants : cookie de session httpOnly, SameSite=Strict, et profil sans mot de passe', async () => {
    await creerCompte()
    const rep = await requete({ method: 'POST', url: '/api/admin/connexion', payload: { email: ' CLAIRE@vanlife.example', motDePasse: MOT_DE_PASSE } })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toEqual({ id: expect.any(String), email: 'claire@vanlife.example', nom: 'Claire Martin', role: 'ADMIN' })
    const cookie = rep.cookies.find((c) => c.name === COOKIE_SESSION)!
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api' })
    expect(cookie.value.length).toBeGreaterThanOrEqual(43) // 256 bits
    // La base ne contient que l'empreinte du jeton, jamais le jeton lui-même.
    const session = await prisma.session.findFirstOrThrow()
    expect(session.id).not.toBe(cookie.value)
    expect(rep.body).not.toContain('argon2')
    expect((await prisma.utilisateur.findFirstOrThrow()).derniereConnexion).not.toBeNull()
  })

  it.each([
    ['mauvais mot de passe', 'claire@vanlife.example', 'pas le bon mot de passe'],
    ['e-mail inconnu', 'inconnu@vanlife.example', MOT_DE_PASSE],
  ])('%s : même réponse 401, sans dire ce qui ne va pas', async (_cas, email, motDePasse) => {
    await creerCompte()
    const rep = await requete({ method: 'POST', url: '/api/admin/connexion', payload: { email, motDePasse } })
    expect(rep.statusCode).toBe(401)
    expect(rep.json()).toEqual({ message: 'Adresse e-mail ou mot de passe incorrect.' })
    expect(rep.cookies).toHaveLength(0)
  })

  it('compte désactivé : connexion refusée, et ses sessions ouvertes ne fonctionnent plus', async () => {
    const appel = await connecter()
    await prisma.utilisateur.updateMany({ data: { actif: false } })
    expect((await appel({ method: 'GET', url: '/api/admin/moi' })).statusCode).toBe(401)
    const rep = await requete({ method: 'POST', url: '/api/admin/connexion', payload: { email: 'claire@vanlife.example', motDePasse: MOT_DE_PASSE } })
    expect(rep.statusCode).toBe(401)
  })

  it('limite à 5 essais par minute (contre les essais de mots de passe en série)', async () => {
    const appLimitee = await creerApp({ limiteConnexionsParMinute: 5 })
    const codes = []
    for (let i = 0; i < 6; i++) {
      const rep = await appLimitee.inject({
        method: 'POST', url: '/api/admin/connexion', headers: { origin: ORIGINE },
        payload: { email: 'x@vanlife.example', motDePasse: 'mauvais mot de passe' },
      })
      codes.push(rep.statusCode)
    }
    expect(codes).toEqual([401, 401, 401, 401, 401, 429])
    await appLimitee.close()
  })

  it('session expirée : il faut se reconnecter', async () => {
    const appel = await connecter()
    await prisma.session.updateMany({ data: { expireLe: new Date('2000-01-01') } })
    expect((await appel({ method: 'GET', url: '/api/admin/moi' })).statusCode).toBe(401)
  })

  it('déconnexion : la session est supprimée côté serveur', async () => {
    const appel = await connecter()
    expect((await appel({ method: 'POST', url: '/api/admin/deconnexion' })).statusCode).toBe(204)
    expect(await prisma.session.count()).toBe(0)
    expect((await appel({ method: 'GET', url: '/api/admin/moi' })).statusCode).toBe(401)
  })
})

describe('protections', () => {
  it.each([
    ['GET', '/api/admin/moi'],
    ['GET', '/api/admin/demandes'],
    ['GET', '/api/admin/demandes/VL-2027-0001'],
    ['GET', '/api/admin/demandes/export.csv'],
    ['GET', '/api/admin/sejours/bretagne-sauvage/departs'],
    ['POST', '/api/admin/demandes/VL-2027-0001/statut'],
    ['PATCH', '/api/admin/departs/1'],
  ] as const)('%s %s sans connexion → 401', async (method, url) => {
    const rep = await requete({ method, url, payload: method === 'GET' ? undefined : { statut: 'CONFIRMEE', informerClient: false } })
    expect(rep.statusCode).toBe(401)
  })

  it('un faux cookie de session est refusé', async () => {
    const rep = await app.inject({ method: 'GET', url: '/api/admin/moi', cookies: { [COOKIE_SESSION]: 'invente' } })
    expect(rep.statusCode).toBe(401)
  })

  it('modification venant d’un autre site (CSRF) → 403, même connecté', async () => {
    const appel = await connecter()
    const reference = await nouvelleDemande()
    for (const origin of ['https://site-pirate.example', undefined]) {
      const rep = await appel({
        method: 'POST', url: `/api/admin/demandes/${reference}/statut`,
        headers: { origin }, payload: { statut: 'CONFIRMEE', informerClient: false },
      })
      expect(rep.statusCode).toBe(403)
    }
    expect((await prisma.demande.findFirstOrThrow()).statut).toBe('RECUE')
  })

  it('un gestionnaire traite les demandes mais ne peut pas modifier les départs', async () => {
    const appel = await connecter('gestion@vanlife.example', 'GESTIONNAIRE')
    expect((await appel({ method: 'GET', url: '/api/admin/demandes' })).statusCode).toBe(200)
    const depart = await prisma.depart.findFirstOrThrow()
    expect((await appel({ method: 'PATCH', url: `/api/admin/departs/${depart.id}`, payload: { statut: 'FERME' } })).statusCode).toBe(403)
    expect((await appel({ method: 'POST', url: '/api/admin/departs', payload: { sejourId: 'bretagne-sauvage', date: '2027-09-04', capacite: 2 } })).statusCode).toBe(403)
  })
})

describe('liste des demandes', () => {
  it('les plus récentes d’abord, avec les compteurs par statut', async () => {
    const appel = await connecter()
    await nouvelleDemande('camille@exemple.fr')
    await nouvelleDemande('louis@exemple.fr')
    await prisma.demande.update({ where: { reference: 'VL-2027-0001' }, data: { statut: 'EN_ETUDE' } })
    const rep = await appel({ method: 'GET', url: '/api/admin/demandes' })
    expect(rep.statusCode).toBe(200)
    const page = rep.json()
    expect(page.total).toBe(2)
    expect(page.compteurs).toEqual({ RECUE: 1, EN_ETUDE: 1, CONFIRMEE: 0, REFUSEE: 0, ANNULEE: 0 })
    expect(page.demandes[0]).toEqual({
      reference: 'VL-2027-0002', statut: 'RECUE', creeLe: expect.any(String), dateDepart: '2027-05-15',
      sejourNom: 'Bretagne Sauvage', client: { prenom: 'Camille', nom: null, email: 'louis@exemple.fr' },
    })
  })

  it('filtre par statut et par recherche (référence, nom, e-mail…)', async () => {
    const appel = await connecter()
    await nouvelleDemande('camille@exemple.fr')
    await nouvelleDemande('louis@exemple.fr')
    await prisma.demande.update({ where: { reference: 'VL-2027-0001' }, data: { statut: 'EN_ETUDE' } })
    const parStatut = (await appel({ method: 'GET', url: '/api/admin/demandes?statut=EN_ETUDE' })).json()
    expect(parStatut.demandes.map((d: { reference: string }) => d.reference)).toEqual(['VL-2027-0001'])
    const parRecherche = (await appel({ method: 'GET', url: '/api/admin/demandes?recherche=LOUIS' })).json()
    expect(parRecherche.demandes.map((d: { reference: string }) => d.reference)).toEqual(['VL-2027-0002'])
    expect(parRecherche.compteurs.RECUE).toBe(1) // compteurs restreints à la recherche
    expect((await appel({ method: 'GET', url: '/api/admin/demandes?statut=INVENTE' })).statusCode).toBe(400)
  })
})

describe('détail et changement de statut', () => {
  it('détail complet : client, message, historique, e-mails, statuts possibles', async () => {
    const appel = await connecter()
    const reference = await nouvelleDemande()
    const rep = await appel({ method: 'GET', url: `/api/admin/demandes/${reference}` })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toMatchObject({
      reference, statut: 'RECUE', dateDepart: '2027-05-15', dateRetour: '2027-05-19', prixIndicatif: 1390,
      client: { prenom: 'Camille', email: 'camille@exemple.fr' },
      historique: [{ ancienStatut: null, nouveauStatut: 'RECUE', auteur: null }],
      emails: [{ type: 'ACCUSE_RECEPTION', statut: 'EN_ATTENTE' }, { type: 'NOTIFICATION_VANLIFE', statut: 'EN_ATTENTE' }],
      transitionsPossibles: ['EN_ETUDE', 'CONFIRMEE', 'REFUSEE', 'ANNULEE'],
    })
    expect((await appel({ method: 'GET', url: '/api/admin/demandes/VL-0000-0000' })).statusCode).toBe(404)
  })

  it('confirmer avec e-mail : historique signé, e-mail au client en file, envoi déclenché', async () => {
    const appel = await connecter()
    const reference = await nouvelleDemande()
    declencherEnvoi.mockClear()
    const rep = await appel({
      method: 'POST', url: `/api/admin/demandes/${reference}/statut`,
      payload: { statut: 'CONFIRMEE', commentaire: 'Rendez-vous à 9 h à Rennes.', informerClient: true },
    })
    expect(rep.statusCode).toBe(200)
    const detail = rep.json()
    expect(detail.statut).toBe('CONFIRMEE')
    expect(detail.transitionsPossibles).toEqual(['ANNULEE'])
    expect(detail.historique.at(-1)).toMatchObject({
      ancienStatut: 'RECUE', nouveauStatut: 'CONFIRMEE', auteur: 'Claire Martin', commentaire: 'Rendez-vous à 9 h à Rennes.',
    })
    const email = await prisma.emailSortant.findFirstOrThrow({ where: { type: 'CHANGEMENT_STATUT' } })
    expect(email).toMatchObject({ destinataire: 'camille@exemple.fr', sujet: `Votre séjour est confirmé — ${reference}` })
    expect(email.texte).toContain('Message de Vanlife : Rendez-vous à 9 h à Rennes.')
    expect(declencherEnvoi).toHaveBeenCalledOnce()
  })

  it('sans informer le client : aucun e-mail', async () => {
    const appel = await connecter()
    const reference = await nouvelleDemande()
    declencherEnvoi.mockClear()
    await appel({ method: 'POST', url: `/api/admin/demandes/${reference}/statut`, payload: { statut: 'EN_ETUDE', informerClient: false } })
    expect(await prisma.emailSortant.count({ where: { type: 'CHANGEMENT_STATUT' } })).toBe(0)
    expect(declencherEnvoi).not.toHaveBeenCalled()
  })

  it.each([
    ['même statut', 'RECUE', 'RECUE', 'La demande a déjà ce statut.'],
    ['retour en arrière', 'CONFIRMEE', 'EN_ETUDE', 'Une demande « Confirmée » ne peut pas passer à « En étude ».'],
    ['demande close', 'REFUSEE', 'CONFIRMEE', 'Une demande « Refusée » ne peut pas passer à « Confirmée ».'],
  ] as const)('changement interdit (%s) → 400', async (_cas, depuis, vers, message) => {
    const appel = await connecter()
    const reference = await nouvelleDemande()
    await prisma.demande.update({ where: { reference }, data: { statut: depuis } })
    const rep = await appel({ method: 'POST', url: `/api/admin/demandes/${reference}/statut`, payload: { statut: vers, informerClient: true } })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ message })
    expect(await prisma.emailSortant.count({ where: { type: 'CHANGEMENT_STATUT' } })).toBe(0)
  })

  it('deux personnes changent le statut en même temps : un seul changement est appliqué', async () => {
    const appel = await connecter()
    const reference = await nouvelleDemande()
    const reponses = await Promise.all(['CONFIRMEE', 'REFUSEE'].map((statut) =>
      appel({ method: 'POST', url: `/api/admin/demandes/${reference}/statut`, payload: { statut, informerClient: true } })))
    expect(reponses.map((r) => r.statusCode).sort()).toEqual([200, 409].sort())
    expect(await prisma.historiqueStatut.count()).toBe(2) // création + un seul changement
    expect(await prisma.emailSortant.count({ where: { type: 'CHANGEMENT_STATUT' } })).toBe(1)
  })

  it('refuser une demande libère sa place pour un autre client', async () => {
    const appel = await connecter()
    const reference = await nouvelleDemande('camille@exemple.fr', '2027-06-12') // départ à 1 place
    expect((await app.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, email: 'louis@exemple.fr', dateDepart: '2027-06-12' } })).statusCode).toBe(409)
    await appel({ method: 'POST', url: `/api/admin/demandes/${reference}/statut`, payload: { statut: 'REFUSEE', informerClient: false } })
    expect((await app.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, email: 'louis@exemple.fr', dateDepart: '2027-06-12' } })).statusCode).toBe(201)
  })

  it('note interne : enregistrée, visible dans le détail, jamais pour le client', async () => {
    const appel = await connecter()
    const reference = await nouvelleDemande()
    const rep = await appel({ method: 'PUT', url: `/api/admin/demandes/${reference}/note`, payload: { noteInterne: '  Rappeler mardi  ' } })
    expect(rep.json().noteInterne).toBe('Rappeler mardi')
    const jeton = (await app.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, email: 'autre@exemple.fr' } })).json().jetonSuivi
    const autre = (await prisma.demande.findFirstOrThrow({ where: { client: { email: 'autre@exemple.fr' } } })).reference
    await appel({ method: 'PUT', url: `/api/admin/demandes/${autre}/note`, payload: { noteInterne: 'Rappeler mardi' } })
    const suivi = await app.inject({ method: 'POST', url: '/api/suivi', payload: { reference: autre, jeton } })
    expect(suivi.statusCode).toBe(200)
    expect(suivi.body).not.toContain('Rappeler mardi')
    expect((await appel({ method: 'PUT', url: `/api/admin/demandes/${reference}/note`, payload: { noteInterne: 'x'.repeat(2001) } })).statusCode).toBe(400)
  })
})

describe('export CSV', () => {
  it('fichier pour tableur : en-tête, séparateur « ; », accents (BOM), téléchargement', async () => {
    const appel = await connecter()
    await nouvelleDemande()
    const rep = await appel({ method: 'GET', url: '/api/admin/demandes/export.csv' })
    expect(rep.statusCode).toBe(200)
    expect(rep.headers['content-type']).toBe('text/csv; charset=utf-8')
    expect(rep.headers['content-disposition']).toBe('attachment; filename="demandes-vanlife-2027-01-10.csv"')
    const [entete, ligne] = rep.body.replace('﻿', '').split('\r\n')
    expect(entete).toBe('"Référence";"Statut";"Reçue le";"Séjour";"Départ";"Retour";"Prénom";"Nom";"E-mail";"Téléphone";"Prix indicatif (€)";"Message"')
    expect(ligne).toContain('"VL-2027-0001";"RECUE"')
    expect(rep.body.startsWith('﻿')).toBe(true)
  })

  it('neutralise les formules de tableur et les guillemets (injection de formule)', () => {
    expect(celluleCsv('=HYPERLINK("http://pirate")')).toBe(`"'=HYPERLINK(""http://pirate"")"`)
    expect(celluleCsv('+33 6 12')).toBe(`"'+33 6 12"`)
    expect(celluleCsv('Camille')).toBe('"Camille"')
    expect(celluleCsv(null)).toBe('""')
  })
})

describe('départs', () => {
  it('liste avec le remplissage de chaque départ', async () => {
    const appel = await connecter()
    await nouvelleDemande()
    const rep = await appel({ method: 'GET', url: '/api/admin/sejours/bretagne-sauvage/departs' })
    expect(rep.json()).toEqual([
      { id: expect.any(Number), date: '2027-05-15', capacite: 2, statut: 'OUVERT', demandesActives: 1, demandesConfirmees: 0 },
      { id: expect.any(Number), date: '2027-06-12', capacite: 1, statut: 'OUVERT', demandesActives: 0, demandesConfirmees: 0 },
    ])
  })

  it('créer un départ : visible aussitôt sur le site public', async () => {
    const appel = await connecter()
    const rep = await appel({ method: 'POST', url: '/api/admin/departs', payload: { sejourId: 'bretagne-sauvage', date: '2027-09-04', capacite: 3 } })
    expect(rep.statusCode).toBe(201)
    const publics = (await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage/departs' })).json()
    expect(publics.at(-1)).toMatchObject({ date: '2027-09-04', placesRestantes: 3 })
  })

  it.each([
    ['date passée', { date: '2027-01-02', capacite: 2 }, 'La date de départ doit être postérieure à aujourd’hui.'],
    ['date impossible', { date: '2027-02-30', capacite: 2 }, "La date n'est pas valide."],
    ['doublon', { date: '2027-05-15', capacite: 2 }, 'Un départ existe déjà à cette date.'],
    ['capacité nulle', { date: '2027-09-04', capacite: 0 }, 'La capacité doit être un nombre entier de vans, entre 1 et 20.'],
  ])('création refusée : %s', async (_cas, valeurs, message) => {
    const appel = await connecter()
    const rep = await appel({ method: 'POST', url: '/api/admin/departs', payload: { sejourId: 'bretagne-sauvage', ...valeurs } })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ message })
  })

  it('fermer un départ le retire du site public', async () => {
    const appel = await connecter()
    const depart = await prisma.depart.findFirstOrThrow({ where: { capacite: 1 } })
    const rep = await appel({ method: 'PATCH', url: `/api/admin/departs/${depart.id}`, payload: { statut: 'FERME' } })
    expect(rep.json()).toMatchObject({ statut: 'FERME' })
    const publics = (await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage/departs' })).json()
    expect(publics.map((d: { date: string }) => d.date)).toEqual(['2027-05-15'])
  })

  it('la capacité ne peut pas descendre sous le nombre de places déjà prises', async () => {
    const appel = await connecter()
    await nouvelleDemande('a@exemple.fr')
    await nouvelleDemande('b@exemple.fr')
    const depart = await prisma.depart.findFirstOrThrow({ where: { capacite: 2 } })
    const refus = await appel({ method: 'PATCH', url: `/api/admin/departs/${depart.id}`, payload: { capacite: 1 } })
    expect(refus.statusCode).toBe(400)
    expect(refus.json().message).toContain('2 demande(s) occupent déjà ce départ')
    const ok = await appel({ method: 'PATCH', url: `/api/admin/departs/${depart.id}`, payload: { capacite: 4 } })
    expect(ok.json()).toMatchObject({ capacite: 4, demandesActives: 2 })
  })
})

describe('mot de passe', () => {
  it('changement : ancien mot de passe vérifié, longueur minimale, autres sessions fermées', async () => {
    const appel = await connecter()
    // Une seconde session (autre appareil).
    await requete({ method: 'POST', url: '/api/admin/connexion', payload: { email: 'claire@vanlife.example', motDePasse: MOT_DE_PASSE } })
    expect(await prisma.session.count()).toBe(2)

    const mauvais = await appel({ method: 'POST', url: '/api/admin/mot-de-passe', payload: { actuel: 'faux', nouveau: 'nouveau mot de passe long' } })
    expect(mauvais.json()).toEqual({ erreurs: { actuel: 'Le mot de passe actuel est incorrect.' } })
    const court = await appel({ method: 'POST', url: '/api/admin/mot-de-passe', payload: { actuel: MOT_DE_PASSE, nouveau: 'court' } })
    expect(court.json()).toEqual({ erreurs: { nouveau: 'Le mot de passe doit contenir au moins 12 caractères.' } })

    const ok = await appel({ method: 'POST', url: '/api/admin/mot-de-passe', payload: { actuel: MOT_DE_PASSE, nouveau: 'nouveau mot de passe long' } })
    expect(ok.statusCode).toBe(204)
    expect(await prisma.session.count()).toBe(1) // l'autre appareil est déconnecté, pas celui-ci
    expect((await appel({ method: 'GET', url: '/api/admin/moi' })).statusCode).toBe(200)
    const reconnexion = await requete({ method: 'POST', url: '/api/admin/connexion', payload: { email: 'claire@vanlife.example', motDePasse: 'nouveau mot de passe long' } })
    expect(reconnexion.statusCode).toBe(200)
  })
})
