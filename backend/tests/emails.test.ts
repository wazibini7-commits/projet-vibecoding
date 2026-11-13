import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemandeReservation } from '../../src/domain/types'
import {
  echapperHtml, modeleAccuseReception, modeleChangementStatut, modeleNotificationVanlife,
} from '../src/emails/modeles'
import {
  DELAIS_NOUVEL_ESSAI_MS, TENTATIVES_MAX, demarrerFileEmails, reprendreEmailsInterrompus, traiterFileEmails,
  type MessageSortant, type TransportEmail,
} from '../src/emails/file'
import { formaterPrix } from '../../src/utils/format'
import { creerApp, creerSejour, DEMANDE_VALIDE, EMAIL_EQUIPE, prisma, viderBase } from './outils'

const DEMANDE: DemandeReservation = {
  reference: 'VL-2027-0042',
  statut: 'RECUE',
  creeeLe: '2027-01-10T11:00:00.000Z',
  sejour: {
    id: 'bretagne-sauvage', nom: 'Bretagne Sauvage', jours: 5, nuits: 4,
    nombreVoyageurs: 2, villeDepart: 'Rennes', villeRetour: 'Rennes', prixIndicatif: 1390,
  },
  voyageur: { prenom: 'Camille', email: 'camille@exemple.fr' },
  dateDepart: '2027-05-15',
  dateRetour: '2027-05-19',
}

const EXPEDITEUR = 'Vanlife <reservations@vanlife.example>'

/** Faux transport : garde les messages « envoyés » ; peut échouer à la demande. */
function fauxTransport(echecs = 0) {
  const envoyes: MessageSortant[] = []
  let restant = echecs
  const transport: TransportEmail = {
    async envoyer(m) {
      if (restant > 0) { restant--; throw new Error('Connexion SMTP refusée') }
      envoyes.push(m)
    },
  }
  return { transport, envoyes }
}

async function emailEnFile(destinataire = 'camille@exemple.fr') {
  return prisma.emailSortant.create({
    data: { type: 'ACCUSE_RECEPTION', destinataire, sujet: 'Sujet', texte: 'Texte', html: '<p>HTML</p>' },
  })
}

afterAll(() => prisma.$disconnect())
beforeEach(viderBase)

describe('contenu des e-mails', () => {
  it('accusé de réception : référence, dates, prix, « pas encore une réservation »', () => {
    const e = modeleAccuseReception(DEMANDE)
    expect(e.sujet).toBe('Votre demande VL-2027-0042 — Bretagne Sauvage')
    expect(e.texte).toContain('Bonjour Camille,')
    expect(e.html).toContain('Merci Camille, nous avons bien reçu votre demande')
    for (const attendu of [
      'VL-2027-0042', 'samedi 15 mai 2027 — Rennes', 'mercredi 19 mai 2027 — Rennes',
      `${formaterPrix(1390)} pour 2 (à confirmer)`, "Ce n'est pas encore une réservation", 'Aucun paiement',
    ]) {
      expect(e.texte).toContain(attendu)
      expect(e.html).toContain(echapperHtml(attendu))
    }
    expect(e.html).toMatch(/^<!doctype html>/)
    expect(e.html).toContain('lang="fr"')
  })

  it('notification Vanlife : coordonnées du client et son message', () => {
    const e = modeleNotificationVanlife(DEMANDE, 'Nous voyageons avec un chien.')
    expect(e.sujet).toBe('Nouvelle demande VL-2027-0042 — départ le samedi 15 mai 2027')
    expect(e.texte).toContain('- E-mail : camille@exemple.fr')
    expect(e.texte).toContain('- Message : Nous voyageons avec un chien.')
    expect(modeleNotificationVanlife(DEMANDE, null).texte).toContain('- Message : (aucun)')
  })

  it('les valeurs saisies par un visiteur sont échappées dans le HTML (pas d’injection de code)', () => {
    const piege = '<script>alert("x")</script>'
    const e = modeleNotificationVanlife({ ...DEMANDE, voyageur: { prenom: piege, email: 'a@b.fr' } }, `<img src=x onerror="y">`)
    expect(e.html).not.toContain('<script>')
    expect(e.html).not.toContain('<img')
    expect(e.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(e.texte).toContain(piege) // la version texte n'est pas interprétée : elle reste telle quelle
  })

  it.each([
    ['EN_ETUDE', 'Votre demande est en cours d’étude — VL-2027-0042'],
    ['CONFIRMEE', 'Votre séjour est confirmé — VL-2027-0042'],
    ['REFUSEE', 'Votre demande n’a pas pu être acceptée — VL-2027-0042'],
    ['ANNULEE', 'Votre demande a été annulée — VL-2027-0042'],
  ] as const)('changement de statut %s', (statut, sujet) => {
    const e = modeleChangementStatut(DEMANDE, statut, 'Prévoir des vêtements chauds.')
    expect(e.sujet).toBe(sujet)
    expect(e.texte).toContain('Message de Vanlife : Prévoir des vêtements chauds.')
  })
})

describe('file d’envoi', () => {
  it('envoie les e-mails en attente et les marque « envoyés »', async () => {
    await emailEnFile()
    const { transport, envoyes } = fauxTransport()
    expect(await traiterFileEmails(prisma, transport, { expediteur: EXPEDITEUR })).toEqual({ envoyes: 1, reportes: 0, abandonnes: 0 })
    expect(envoyes).toEqual([{ de: EXPEDITEUR, a: 'camille@exemple.fr', sujet: 'Sujet', texte: 'Texte', html: '<p>HTML</p>' }])
    const email = await prisma.emailSortant.findFirstOrThrow()
    expect(email).toMatchObject({ statut: 'ENVOYE', tentatives: 1, derniereErreur: null })
    expect(email.envoyeLe).toBeInstanceOf(Date)
    // Un second passage ne renvoie rien.
    expect((await traiterFileEmails(prisma, transport, { expediteur: EXPEDITEUR })).envoyes).toBe(0)
    expect(envoyes).toHaveLength(1)
  })

  it('panne du serveur de messagerie : nouvel essai programmé, avec l’erreur conservée', async () => {
    await emailEnFile()
    const { transport, envoyes } = fauxTransport(1)
    const maintenant = new Date('2027-01-10T12:00:00Z')
    expect((await traiterFileEmails(prisma, transport, { expediteur: EXPEDITEUR, maintenant })).reportes).toBe(1)
    const email = await prisma.emailSortant.findFirstOrThrow()
    expect(email).toMatchObject({ statut: 'EN_ATTENTE', tentatives: 1, derniereErreur: 'Connexion SMTP refusée' })
    expect(email.prochaineTentative.getTime()).toBe(maintenant.getTime() + DELAIS_NOUVEL_ESSAI_MS[0])
    // Trop tôt : rien ne se passe. À l'heure prévue : l'e-mail part.
    expect((await traiterFileEmails(prisma, transport, { expediteur: EXPEDITEUR, maintenant })).envoyes).toBe(0)
    const plusTard = new Date(maintenant.getTime() + DELAIS_NOUVEL_ESSAI_MS[0])
    expect((await traiterFileEmails(prisma, transport, { expediteur: EXPEDITEUR, maintenant: plusTard })).envoyes).toBe(1)
    expect(envoyes).toHaveLength(1)
  })

  it(`abandon après ${TENTATIVES_MAX} essais (statut ÉCHEC)`, async () => {
    await emailEnFile()
    const { transport } = fauxTransport(Infinity)
    let maintenant = new Date('2027-01-10T12:00:00Z')
    for (let i = 0; i < TENTATIVES_MAX; i++) {
      await traiterFileEmails(prisma, transport, { expediteur: EXPEDITEUR, maintenant })
      maintenant = new Date(maintenant.getTime() + 2 * 60 * 60_000)
    }
    expect(await prisma.emailSortant.findFirstOrThrow()).toMatchObject({ statut: 'ECHEC', tentatives: TENTATIVES_MAX })
  })

  it('un e-mail n’est jamais envoyé deux fois, même avec deux traitements simultanés', async () => {
    for (let i = 0; i < 5; i++) await emailEnFile(`client${i}@exemple.fr`)
    const { transport, envoyes } = fauxTransport()
    await Promise.all([1, 2, 3].map(() => traiterFileEmails(prisma, transport, { expediteur: EXPEDITEUR })))
    expect(envoyes.map((m) => m.a).sort()).toEqual([0, 1, 2, 3, 4].map((i) => `client${i}@exemple.fr`))
  })

  it('au redémarrage, un e-mail interrompu en plein envoi est remis dans la file', async () => {
    const email = await emailEnFile()
    await prisma.emailSortant.update({ where: { id: email.id }, data: { statut: 'EN_COURS' } })
    expect(await reprendreEmailsInterrompus(prisma)).toBe(1)
    expect(await prisma.emailSortant.findFirstOrThrow()).toMatchObject({ statut: 'EN_ATTENTE' })
  })

  it('le traitement en arrière-plan envoie dès qu’on le déclenche', async () => {
    const { transport, envoyes } = fauxTransport()
    const journal = { info: vi.fn(), error: vi.fn() }
    const file = demarrerFileEmails({ prisma, transport, expediteur: EXPEDITEUR, intervalleMs: 60_000, journal })
    await emailEnFile()
    file.declencher()
    await vi.waitFor(() => expect(envoyes).toHaveLength(1))
    await file.arreter()
    expect(journal.error).not.toHaveBeenCalled()
  })
})

describe('une nouvelle demande met ses e-mails en file', () => {
  it('accusé de réception au client + notification à Vanlife, puis envoi immédiat déclenché', async () => {
    await creerSejour([{ date: '2027-05-15' }])
    const declencherEnvoi = vi.fn()
    const app = await creerApp({ declencherEnvoi })
    const rep = await app.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, message: 'Avec un chien' } })
    expect(rep.statusCode).toBe(201)
    const emails = await prisma.emailSortant.findMany({ orderBy: { id: 'asc' }, include: { demande: true } })
    expect(emails.map((e) => [e.type, e.destinataire, e.statut])).toEqual([
      ['ACCUSE_RECEPTION', 'camille@exemple.fr', 'EN_ATTENTE'],
      ['NOTIFICATION_VANLIFE', EMAIL_EQUIPE, 'EN_ATTENTE'],
    ])
    expect(emails.every((e) => e.demande?.reference === 'VL-2027-0001')).toBe(true)
    expect(emails[0].sujet).toBe('Votre demande VL-2027-0001 — Bretagne Sauvage')
    expect(emails[1].texte).toContain('- Message : Avec un chien')
    expect(declencherEnvoi).toHaveBeenCalledOnce()
    await app.close()
  })

  it('demande refusée : aucun e-mail', async () => {
    await creerSejour([{ date: '2027-05-15' }])
    const declencherEnvoi = vi.fn()
    const app = await creerApp({ declencherEnvoi })
    await app.inject({ method: 'POST', url: '/api/demandes', payload: { ...DEMANDE_VALIDE, email: 'faux' } })
    expect(await prisma.emailSortant.count()).toBe(0)
    expect(declencherEnvoi).not.toHaveBeenCalled()
    await app.close()
  })
})
