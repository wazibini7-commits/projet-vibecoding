import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { SEJOUR_BRETAGNE_SAUVAGE } from '../../src/data/sejour'
import { creerApp, creerSejour, DEMANDE_VALIDE, prisma, viderBase } from './outils'

const app = await creerApp()
afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})
beforeEach(viderBase)

describe('GET /api/sante', () => {
  it('indique que le serveur et la base répondent', async () => {
    const rep = await app.inject({ method: 'GET', url: '/api/sante' })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toEqual({ statut: 'ok', baseDeDonnees: 'ok' })
  })
})

describe('GET /api/sejours', () => {
  it('liste les séjours publiés', async () => {
    await creerSejour()
    const rep = await app.inject({ method: 'GET', url: '/api/sejours' })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toEqual([
      expect.objectContaining({ id: 'bretagne-sauvage', nom: 'Bretagne Sauvage', prixIndicatif: 1390 }),
    ])
  })

  it("n'affiche pas un séjour non publié", async () => {
    await creerSejour()
    await prisma.sejour.update({ where: { id: 'bretagne-sauvage' }, data: { publie: false } })
    expect((await app.inject({ method: 'GET', url: '/api/sejours' })).json()).toEqual([])
    expect((await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage' })).statusCode).toBe(404)
  })
})

describe('GET /api/sejours/:id', () => {
  it('renvoie EXACTEMENT le séjour du frontend (même format, même contenu)', async () => {
    await creerSejour()
    const rep = await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage' })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toEqual(SEJOUR_BRETAGNE_SAUVAGE)
  })

  it('répond 404 pour un séjour inconnu', async () => {
    const rep = await app.inject({ method: 'GET', url: '/api/sejours/inconnu' })
    expect(rep.statusCode).toBe(404)
    expect(rep.json()).toEqual({ message: 'Séjour introuvable.' })
  })
})

describe('GET /api/sejours/:id/departs', () => {
  it('liste uniquement les départs à venir et non fermés, avec la date de retour', async () => {
    await creerSejour([
      { date: '2027-01-02' }, // passé (aujourd'hui = 10 janvier 2027)
      { date: '2027-01-10' }, // aujourd'hui : refusé, comme dans le formulaire
      { date: '2027-05-15' },
      { date: '2027-05-22', statut: 'FERME' },
    ])
    const rep = await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage/departs' })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toEqual([{ date: '2027-05-15', dateRetour: '2027-05-19', placesRestantes: 2, complet: false }])
  })

  it('décompte les places prises et signale un départ complet', async () => {
    await creerSejour([{ date: '2027-05-15', capacite: 1 }, { date: '2027-05-22', statut: 'COMPLET' }])
    await app.inject({ method: 'POST', url: '/api/demandes', payload: DEMANDE_VALIDE })
    const rep = await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage/departs' })
    expect(rep.json()).toEqual([
      expect.objectContaining({ date: '2027-05-15', placesRestantes: 0, complet: true }),
      expect.objectContaining({ date: '2027-05-22', placesRestantes: 0, complet: true }),
    ])
  })

  it("une demande annulée libère sa place", async () => {
    await creerSejour([{ date: '2027-05-15', capacite: 1 }])
    await app.inject({ method: 'POST', url: '/api/demandes', payload: DEMANDE_VALIDE })
    await prisma.demande.updateMany({ data: { statut: 'ANNULEE' } })
    const rep = await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage/departs' })
    expect(rep.json()[0]).toMatchObject({ placesRestantes: 1, complet: false })
  })

  it('répond 404 pour un séjour inconnu', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/sejours/inconnu/departs' })).statusCode).toBe(404)
  })
})

describe('adresses et sécurité', () => {
  it('répond 404 en français pour une adresse inconnue', async () => {
    const rep = await app.inject({ method: 'GET', url: '/api/nimporte-quoi' })
    expect(rep.statusCode).toBe(404)
    expect(rep.json()).toEqual({ message: 'Adresse inconnue.' })
  })

  it('autorise le site Vanlife (CORS) mais pas un site inconnu', async () => {
    const autorise = await app.inject({ method: 'GET', url: '/api/sejours', headers: { origin: 'http://localhost:5173' } })
    expect(autorise.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    const refuse = await app.inject({ method: 'GET', url: '/api/sejours', headers: { origin: 'https://site-pirate.example' } })
    expect(refuse.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('ajoute les en-têtes de sécurité', async () => {
    const rep = await app.inject({ method: 'GET', url: '/api/sante' })
    expect(rep.headers['x-content-type-options']).toBe('nosniff')
  })
})
