import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance, InjectOptions } from 'fastify'
import { MESSAGE_LIEN_ENVOYE } from '../../src/domain/suivi'
import { hacherMotDePasse } from '../src/auth/securite'
import { COOKIE_SESSION } from '../src/routes/admin'
import { creerApp, creerSejour, DEMANDE_VALIDE, EMAIL_EQUIPE, ORIGINE, prisma, SITE_URL, viderBase } from './outils'

let app: FastifyInstance
const declencherEnvoi = vi.fn()

beforeAll(async () => { app = await creerApp({ declencherEnvoi }) })
afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})
beforeEach(async () => {
  await viderBase()
  declencherEnvoi.mockClear()
  await creerSejour([{ date: '2027-05-15', capacite: 1 }])
})

/** Envoie une demande ; renvoie la référence et le lien personnel donnés au client. */
async function nouvelleDemande(email = 'camille@exemple.fr') {
  const corps = (await app.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, email } })).json()
  return { reference: corps.reference as string, jeton: corps.jetonSuivi as string }
}
const poster = (url: string, payload: object) => app.inject({ method: 'POST', url, payload })

/** Extrait le lien de suivi (secret) d'un e-mail en file. */
async function lienDansEmail(type: 'ACCUSE_RECEPTION' | 'LIEN_SUIVI' | 'CHANGEMENT_STATUT' | 'MESSAGE_VANLIFE') {
  const email = await prisma.emailSortant.findFirstOrThrow({ where: { type }, orderBy: { id: 'desc' } })
  const m = /#\/suivi\/([^/\s]+)\/([A-Za-z0-9_-]+)/.exec(email.texte)!
  return { reference: decodeURIComponent(m[1]), jeton: m[2], email }
}

describe('lien personnel de suivi', () => {
  it('l’accusé de réception contient un lien qui ouvre la demande', async () => {
    const { reference, jeton } = await nouvelleDemande()
    const lien = await lienDansEmail('ACCUSE_RECEPTION')
    expect(lien.email.texte).toContain(`${SITE_URL}/#/suivi/${reference}/`)
    expect(lien.reference).toBe(reference)
    // Le lien de l'e-mail et celui de la page de confirmation sont deux accès valables.
    for (const j of [lien.jeton, jeton]) {
      const rep = await poster('/api/suivi', { reference, jeton: j })
      expect(rep.statusCode).toBe(200)
    }
  })

  it('ce que voit le client : statut, séjour, historique, possibilité d’annuler', async () => {
    const acces = await nouvelleDemande()
    const rep = await poster('/api/suivi', acces)
    expect(rep.json()).toEqual({
      reference: acces.reference, statut: 'RECUE', creeLe: expect.any(String),
      sejour: { id: 'bretagne-sauvage', nom: 'Bretagne Sauvage', villeDepart: 'Rennes', villeRetour: 'Rennes' },
      dateDepart: '2027-05-15', dateRetour: '2027-05-19', nombreVoyageurs: 2, prixIndicatif: 1390,
      voyageur: { prenom: 'Camille', email: 'camille@exemple.fr' },
      historique: [{ statut: 'RECUE', le: expect.any(String) }],
      messages: [],
      peutAnnuler: true,
    })
  })

  it('la base ne garde que l’empreinte du secret, jamais le secret lui-même', async () => {
    const { jeton } = await nouvelleDemande()
    const acces = await prisma.accesSuivi.findMany()
    expect(acces).toHaveLength(1)
    expect(acces[0].id).not.toBe(jeton)
    expect(acces[0].id).toMatch(/^[0-9a-f]{64}$/)
  })

  it.each([
    ['secret inventé', (a: { reference: string; jeton: string }) => ({ ...a, jeton: 'invente' })],
    ['bon secret, mais pour une autre référence', (a: { reference: string; jeton: string }) => ({ ...a, reference: 'VL-2027-0002' })],
  ])('%s → 404', async (_cas, modifier) => {
    const acces = await nouvelleDemande()
    await nouvelleDemande('louis@exemple.fr') // VL-2027-0002 existe bien
    const rep = await poster('/api/suivi', modifier(acces))
    expect(rep.statusCode).toBe(404)
    expect(rep.json().message).toContain("Ce lien de suivi n'est pas valide ou a expiré")
  })

  it('lien expiré → 404', async () => {
    const acces = await nouvelleDemande()
    await prisma.accesSuivi.updateMany({ data: { expireLe: new Date('2000-01-01') } })
    expect((await poster('/api/suivi', acces)).statusCode).toBe(404)
  })

  it('l’ancienne consultation par référence + e-mail n’existe plus', async () => {
    const { reference } = await nouvelleDemande()
    expect((await poster('/api/demandes/suivi', { reference, email: 'camille@exemple.fr' })).statusCode).toBe(404)
  })
})

describe('lien perdu : nouveau lien par e-mail', () => {
  it('référence + e-mail corrects : le lien part PAR E-MAIL, jamais dans la réponse', async () => {
    const { reference } = await nouvelleDemande()
    const rep = await poster('/api/suivi/lien', { reference: reference.toLowerCase(), email: 'CAMILLE@exemple.fr' })
    expect(rep.statusCode).toBe(202)
    expect(rep.json()).toEqual({ message: MESSAGE_LIEN_ENVOYE })
    const lien = await lienDansEmail('LIEN_SUIVI')
    expect(lien.email.destinataire).toBe('camille@exemple.fr')
    expect(rep.body).not.toContain(lien.jeton)
    expect((await poster('/api/suivi', { reference, jeton: lien.jeton })).statusCode).toBe(200)
    expect(declencherEnvoi).toHaveBeenCalled()
  })

  it.each([
    ['mauvais e-mail', { email: 'pirate@exemple.fr' }],
    ['référence inconnue', { reference: 'VL-2027-9999' }],
  ])('%s : même réponse, aucun e-mail envoyé (on ne révèle rien)', async (_cas, modif) => {
    const { reference } = await nouvelleDemande()
    const rep = await poster('/api/suivi/lien', { reference, email: 'camille@exemple.fr', ...modif })
    expect(rep.statusCode).toBe(202)
    expect(rep.json()).toEqual({ message: MESSAGE_LIEN_ENVOYE })
    expect(await prisma.emailSortant.count({ where: { type: 'LIEN_SUIVI' } })).toBe(0)
  })

  it('pas plus de 3 liens par heure pour une même demande (boîte du client protégée)', async () => {
    const { reference } = await nouvelleDemande()
    for (let i = 0; i < 5; i++) await poster('/api/suivi/lien', { reference, email: 'camille@exemple.fr' })
    expect(await prisma.emailSortant.count({ where: { type: 'LIEN_SUIVI' } })).toBe(3)
  })
})

describe('annulation par le client', () => {
  it('annule, libère la place, trace l’historique, prévient le client et l’équipe', async () => {
    const acces = await nouvelleDemande()
    const rep = await poster('/api/suivi/annuler', { ...acces, motif: 'Changement de dates' })
    expect(rep.statusCode).toBe(200)
    expect(rep.json()).toMatchObject({ statut: 'ANNULEE', peutAnnuler: false })
    const h = await prisma.historiqueStatut.findFirstOrThrow({ where: { nouveauStatut: 'ANNULEE' } })
    expect(h).toMatchObject({ ancienStatut: 'RECUE', auteurId: null, commentaire: 'Annulée par le client : Changement de dates' })
    const emails = await prisma.emailSortant.findMany({ where: { type: { in: ['CHANGEMENT_STATUT', 'ANNULATION_CLIENT'] } }, orderBy: { id: 'asc' } })
    expect(emails.map((e) => [e.type, e.destinataire])).toEqual([
      ['CHANGEMENT_STATUT', 'camille@exemple.fr'],
      ['ANNULATION_CLIENT', EMAIL_EQUIPE],
    ])
    expect(emails[1].texte).toContain('Motif : Changement de dates')
    // Le départ (1 seul van) est de nouveau disponible.
    expect((await app.inject({ method: 'GET', url: '/api/sejours/bretagne-sauvage/departs' })).json()[0]).toMatchObject({ placesRestantes: 1 })
    expect(declencherEnvoi).toHaveBeenCalled()
  })

  it('impossible sur un séjour déjà confirmé : le client est invité à écrire à Vanlife', async () => {
    const acces = await nouvelleDemande()
    await prisma.demande.updateMany({ data: { statut: 'CONFIRMEE' } })
    expect((await poster('/api/suivi', acces)).json().peutAnnuler).toBe(false)
    const rep = await poster('/api/suivi/annuler', acces)
    expect(rep.statusCode).toBe(409)
    expect(rep.json().message).toContain('écrivez à Vanlife')
    expect((await prisma.demande.findFirstOrThrow()).statut).toBe('CONFIRMEE')
  })

  it('demande déjà close → 409 ; lien invalide → 404 sans rien modifier', async () => {
    const acces = await nouvelleDemande()
    expect((await poster('/api/suivi/annuler', { ...acces, jeton: 'faux' })).statusCode).toBe(404)
    expect((await prisma.demande.findFirstOrThrow()).statut).toBe('RECUE')
    await poster('/api/suivi/annuler', acces)
    expect((await poster('/api/suivi/annuler', acces)).statusCode).toBe(409)
  })
})

describe('messages entre le client et Vanlife', () => {
  const MOT_DE_PASSE = 'un mot de passe solide'
  async function connecterEquipe() {
    await prisma.utilisateur.create({
      data: { email: 'claire@vanlife.example', nom: 'Claire Martin', role: 'GESTIONNAIRE', motDePasseHash: await hacherMotDePasse(MOT_DE_PASSE) },
    })
    const rep = await app.inject({
      method: 'POST', url: '/api/admin/connexion', headers: { origin: ORIGINE },
      payload: { email: 'claire@vanlife.example', motDePasse: MOT_DE_PASSE },
    })
    const jeton = rep.cookies.find((c) => c.name === COOKIE_SESSION)!.value
    return (o: InjectOptions) => app.inject({ ...o, headers: { origin: ORIGINE }, cookies: { [COOKIE_SESSION]: jeton } })
  }

  it('le client écrit → visible dans le back-office, e-mail à l’équipe ; Vanlife répond → e-mail au client avec un lien', async () => {
    const acces = await nouvelleDemande()
    const envoi = await poster('/api/suivi/messages', { ...acces, texte: '  Peut-on partir avec un chien ?  ' })
    expect(envoi.statusCode).toBe(200)
    expect(envoi.json().messages).toEqual([{ auteur: 'CLIENT', signature: null, texte: 'Peut-on partir avec un chien ?', le: expect.any(String) }])
    const alEquipe = await prisma.emailSortant.findFirstOrThrow({ where: { type: 'MESSAGE_CLIENT' } })
    expect(alEquipe.destinataire).toBe(EMAIL_EQUIPE)
    expect(alEquipe.texte).toContain('Peut-on partir avec un chien ?')

    const equipe = await connecterEquipe()
    const reponse = await equipe({ method: 'POST', url: `/api/admin/demandes/${acces.reference}/messages`, payload: { texte: 'Oui, avec plaisir !' } })
    expect(reponse.statusCode).toBe(200)
    expect(reponse.json().messages.map((m: { auteur: string; nom: string | null }) => [m.auteur, m.nom])).toEqual([
      ['CLIENT', null], ['VANLIFE', 'Claire Martin'],
    ])
    const lien = await lienDansEmail('MESSAGE_VANLIFE')
    expect(lien.email.destinataire).toBe('camille@exemple.fr')
    expect(lien.email.texte).toContain("Claire, de l'équipe Vanlife, vous a écrit")
    expect(lien.email.texte).not.toContain('Martin') // le client ne voit que le prénom

    // Le client lit la réponse, signée du seul prénom.
    const vue = (await poster('/api/suivi', { reference: lien.reference, jeton: lien.jeton })).json()
    expect(vue.messages[1]).toMatchObject({ auteur: 'VANLIFE', signature: 'Claire', texte: 'Oui, avec plaisir !' })
  })

  it('message vide ou trop long refusé ; lien invalide → 404', async () => {
    const acces = await nouvelleDemande()
    expect((await poster('/api/suivi/messages', { ...acces, texte: '   ' })).statusCode).toBe(400)
    expect((await poster('/api/suivi/messages', { ...acces, texte: 'x'.repeat(2001) })).statusCode).toBe(400)
    expect((await poster('/api/suivi/messages', { ...acces, jeton: 'faux', texte: 'Bonjour' })).statusCode).toBe(404)
    expect(await prisma.messageDemande.count()).toBe(0)
  })

  it('répondre exige d’être connecté au back-office', async () => {
    const { reference } = await nouvelleDemande()
    const rep = await app.inject({ method: 'POST', url: `/api/admin/demandes/${reference}/messages`, headers: { origin: ORIGINE }, payload: { texte: 'x' } })
    expect(rep.statusCode).toBe(401)
  })

  it('le changement de statut par Vanlife envoie aussi un lien de suivi valable', async () => {
    const acces = await nouvelleDemande()
    const equipe = await connecterEquipe()
    await equipe({ method: 'POST', url: `/api/admin/demandes/${acces.reference}/statut`, payload: { statut: 'EN_ETUDE', informerClient: true } })
    const lien = await lienDansEmail('CHANGEMENT_STATUT')
    expect((await poster('/api/suivi', { reference: lien.reference, jeton: lien.jeton })).json().statut).toBe('EN_ETUDE')
  })
})
