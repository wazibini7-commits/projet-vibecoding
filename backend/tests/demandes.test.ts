import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { MESSAGES } from '../../src/domain/validation'
import { MESSAGES_SERVEUR } from '../src/services/demandes'
import { creerApp, creerSejour, DEMANDE_VALIDE, prisma, viderBase } from './outils'

const app = await creerApp()
afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})
beforeEach(async () => {
  await viderBase()
  await creerSejour([{ date: '2027-05-15' }, { date: '2027-06-12', capacite: 1 }, { date: '2027-07-03', statut: 'FERME' }])
})

const envoyer = (payload: object) => app.inject({ method: 'POST', url: '/api/demandes', payload })

describe('POST /api/demandes — demande valide', () => {
  it('enregistre la demande et renvoie un récapitulatif complet', async () => {
    const rep = await envoyer({ ...DEMANDE_VALIDE, prenom: '  Camille ', email: ' Camille@Exemple.FR ', message: 'Nous avons un chien.' })
    expect(rep.statusCode).toBe(201)
    expect(rep.json()).toEqual({
      reference: 'VL-2027-0001',
      statut: 'RECUE',
      creeeLe: expect.any(String),
      sejour: {
        id: 'bretagne-sauvage', nom: 'Bretagne Sauvage', jours: 5, nuits: 4,
        nombreVoyageurs: 2, villeDepart: 'Rennes', villeRetour: 'Rennes', prixIndicatif: 1390,
      },
      voyageur: { prenom: 'Camille', email: 'camille@exemple.fr' },
      dateDepart: '2027-05-15',
      dateRetour: '2027-05-19',
    })
  })

  it('stocke la demande, le client et la première ligne d’historique en base', async () => {
    await envoyer({ ...DEMANDE_VALIDE, message: 'Nous avons un chien.' })
    const demande = await prisma.demande.findUniqueOrThrow({
      where: { reference: 'VL-2027-0001' },
      include: { client: true, historique: true },
    })
    expect(demande).toMatchObject({ statut: 'RECUE', prixCentimes: 139_000, nombreVoyageurs: 2, message: 'Nous avons un chien.' })
    expect(demande.client).toMatchObject({ prenom: 'Camille', email: 'camille@exemple.fr' })
    expect(demande.historique).toEqual([expect.objectContaining({ ancienStatut: null, nouveauStatut: 'RECUE' })])
  })

  it('numérote les références à la suite', async () => {
    await envoyer(DEMANDE_VALIDE)
    const rep = await envoyer({ ...DEMANDE_VALIDE, email: 'louis@exemple.fr' })
    expect(rep.json().reference).toBe('VL-2027-0002')
  })

  it('réutilise la fiche client existante (même e-mail, quelle que soit la casse)', async () => {
    await envoyer(DEMANDE_VALIDE)
    await envoyer({ ...DEMANDE_VALIDE, email: 'CAMILLE@exemple.fr', dateDepart: '2027-06-12' })
    expect(await prisma.client.count()).toBe(1)
    expect(await prisma.demande.count()).toBe(2)
  })
})

describe('POST /api/demandes — mêmes règles et mêmes messages que le formulaire', () => {
  it('demande vide : une erreur par champ', async () => {
    const rep = await envoyer({ sejourId: 'bretagne-sauvage', prenom: '', email: '', dateDepart: '' })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({
      erreurs: { prenom: MESSAGES.prenomVide, email: MESSAGES.emailVide, dateDepart: MESSAGES.dateVide },
    })
  })

  it.each([
    ['e-mail mal formé', { email: 'camille@exemple' }, { email: MESSAGES.emailMalForme }],
    ['prénom trop long', { prenom: 'A'.repeat(51) }, { prenom: MESSAGES.prenomTropLong }],
    ['date impossible', { dateDepart: '2027-02-30' }, { dateDepart: MESSAGES.dateInvalide }],
    ["date d'aujourd'hui", { dateDepart: '2027-01-10' }, { dateDepart: MESSAGES.datePassee }],
    ['date passée', { dateDepart: '2026-12-01' }, { dateDepart: MESSAGES.datePassee }],
    ['message trop long', { message: 'x'.repeat(1001) }, { message: MESSAGES_SERVEUR.messageTropLong }],
  ])('%s → 400', async (_cas, modification, erreurs) => {
    const rep = await envoyer({ ...DEMANDE_VALIDE, ...modification })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ erreurs })
    expect(await prisma.demande.count()).toBe(0)
  })
})

describe('POST /api/demandes — règles propres au serveur', () => {
  it('refuse une date sans départ prévu', async () => {
    const rep = await envoyer({ ...DEMANDE_VALIDE, dateDepart: '2027-05-16' })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ erreurs: { dateDepart: MESSAGES_SERVEUR.pasDeDepart } })
  })

  it('signale toutes les erreurs en une fois, y compris l’absence de départ', async () => {
    const rep = await envoyer({ ...DEMANDE_VALIDE, prenom: '', dateDepart: '2027-05-16' })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ erreurs: { prenom: MESSAGES.prenomVide, dateDepart: MESSAGES_SERVEUR.pasDeDepart } })
  })

  it('refuse un départ fermé', async () => {
    const rep = await envoyer({ ...DEMANDE_VALIDE, dateDepart: '2027-07-03' })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ erreurs: { dateDepart: MESSAGES_SERVEUR.pasDeDepart } })
  })

  it('refuse un départ complet (409)', async () => {
    await envoyer({ ...DEMANDE_VALIDE, dateDepart: '2027-06-12' })
    const rep = await envoyer({ ...DEMANDE_VALIDE, email: 'louis@exemple.fr', dateDepart: '2027-06-12' })
    expect(rep.statusCode).toBe(409)
    expect(rep.json()).toEqual({ erreurs: { dateDepart: MESSAGES_SERVEUR.departComplet } })
  })

  it('refuse une seconde demande du même client pour le même départ (409)', async () => {
    await envoyer(DEMANDE_VALIDE)
    const rep = await envoyer({ ...DEMANDE_VALIDE, email: 'CAMILLE@exemple.fr' })
    expect(rep.statusCode).toBe(409)
    expect(rep.json()).toEqual({ erreurs: { dateDepart: MESSAGES_SERVEUR.doublon('VL-2027-0001') } })
  })

  it('ne vend jamais deux fois la dernière place, même pour des demandes simultanées', async () => {
    const reponses = await Promise.all(
      ['a', 'b', 'c', 'd', 'e'].map((x) => envoyer({ ...DEMANDE_VALIDE, email: `${x}@exemple.fr`, dateDepart: '2027-06-12' })),
    )
    expect(reponses.map((r) => r.statusCode).sort()).toEqual([201, 409, 409, 409, 409])
    expect(await prisma.demande.count()).toBe(1)
  })

  it('répond 404 pour un séjour inconnu', async () => {
    const rep = await envoyer({ ...DEMANDE_VALIDE, sejourId: 'inconnu' })
    expect(rep.statusCode).toBe(404)
  })
})

describe('POST /api/demandes — requêtes mal formées', () => {
  it.each([
    ['champ manquant', { sejourId: 'bretagne-sauvage', prenom: 'Camille', email: 'camille@exemple.fr' }],
    ['mauvais type', { ...DEMANDE_VALIDE, prenom: 42 }],
  ])('%s → 400 « Requête invalide »', async (_cas, payload) => {
    const rep = await envoyer(payload)
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ message: 'Requête invalide.' })
  })

  it('JSON illisible → 400', async () => {
    const rep = await app.inject({
      method: 'POST', url: '/api/demandes', headers: { 'content-type': 'application/json' }, payload: '{pas du json',
    })
    expect(rep.statusCode).toBe(400)
    expect(rep.json()).toEqual({ message: 'Requête invalide.' })
  })

  it('ignore les champs inconnus (impossible de forcer un statut ou un prix)', async () => {
    const rep = await envoyer({ ...DEMANDE_VALIDE, statut: 'CONFIRMEE', prixCentimes: 1 })
    expect(rep.statusCode).toBe(201)
    expect(rep.json()).toMatchObject({ statut: 'RECUE', sejour: { prixIndicatif: 1390 } })
  })
})

describe('limitation anti-spam', () => {
  it('bloque au-delà du nombre de demandes autorisé par minute (429)', async () => {
    const appLimitee = await creerApp({ limiteDemandesParMinute: 2 })
    const codes = []
    for (const x of ['a', 'b', 'c']) {
      const rep = await appLimitee.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, email: `${x}@exemple.fr` } })
      codes.push(rep.statusCode)
    }
    expect(codes).toEqual([201, 201, 429])
    await appLimitee.close()
  })
})

describe('POST /api/demandes/suivi', () => {
  const suivre = (payload: object) => app.inject({ method: 'POST', url: '/api/demandes/suivi', payload })

  it("donne l'état de la demande avec la bonne référence et le bon e-mail", async () => {
    await envoyer(DEMANDE_VALIDE)
    await prisma.demande.update({ where: { reference: 'VL-2027-0001' }, data: { noteInterne: 'Client fidèle' } })
    const rep = await suivre({ reference: ' vl-2027-0001 ', email: 'CAMILLE@exemple.fr' })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toEqual({
      reference: 'VL-2027-0001',
      statut: 'RECUE',
      sejour: { id: 'bretagne-sauvage', nom: 'Bretagne Sauvage' },
      dateDepart: '2027-05-15',
      dateRetour: '2027-05-19',
      creeeLe: expect.any(String),
      historique: [{ statut: 'RECUE', le: expect.any(String) }],
    })
    expect(rep.body).not.toContain('Client fidèle') // la note interne n'est jamais exposée
  })

  it.each([
    ['mauvais e-mail', { reference: 'VL-2027-0001', email: 'autre@exemple.fr' }],
    ['référence inconnue', { reference: 'VL-2027-9999', email: 'camille@exemple.fr' }],
  ])('%s → 404 avec le même message (ne révèle rien)', async (_cas, payload) => {
    await envoyer(DEMANDE_VALIDE)
    const rep = await suivre(payload)
    expect(rep.statusCode).toBe(404)
    expect(rep.json()).toEqual({ message: 'Aucune demande ne correspond à cette référence et cette adresse e-mail.' })
  })
})
