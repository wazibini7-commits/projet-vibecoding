// @vitest-environment jsdom
// Espace client (#/suivi) avec un faux serveur (MSW) : lien personnel, lien perdu, messages, annulation.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import App from '../App'
import { creerClientRequetes } from '../api/requetes'
import { MESSAGE_LIEN_ENVOYE, STATUTS_ANNULABLES_PAR_CLIENT, type AccesSuivi, type SuiviDemande } from '../domain/suivi'

const JETON = 'secret-valide'
const REFERENCE = 'VL-2027-0001'

const etat = {
  demande: null as unknown as SuiviDemande,
  demandesDeLien: [] as { reference: string; email: string }[],
  annulations: [] as { motif?: string }[],
}

function demandeDeTest(statut: SuiviDemande['statut'] = 'RECUE'): SuiviDemande {
  return {
    reference: REFERENCE, statut, creeLe: '2027-01-10T10:00:00.000Z',
    sejour: { id: 'bretagne-sauvage', nom: 'Bretagne Sauvage', villeDepart: 'Rennes', villeRetour: 'Rennes' },
    dateDepart: '2027-05-15', dateRetour: '2027-05-19', nombreVoyageurs: 2, prixIndicatif: 1390,
    voyageur: { prenom: 'Camille', email: 'camille@exemple.fr' },
    historique: [{ statut: 'RECUE', le: '2027-01-10T10:00:00.000Z' }],
    messages: [],
    peutAnnuler: STATUTS_ANNULABLES_PAR_CLIENT.includes(statut),
  }
}

const accesValide = (a: AccesSuivi) => a.reference === REFERENCE && a.jeton === JETON
const lienInvalide = () => HttpResponse.json({ message: 'Lien invalide' }, { status: 404 })

const serveur = setupServer(
  http.post('*/api/suivi', async ({ request }) => {
    const a = (await request.json()) as AccesSuivi
    return accesValide(a) ? HttpResponse.json(etat.demande) : lienInvalide()
  }),
  http.post('*/api/suivi/lien', async ({ request }) => {
    etat.demandesDeLien.push((await request.json()) as { reference: string; email: string })
    return HttpResponse.json({ message: MESSAGE_LIEN_ENVOYE }, { status: 202 })
  }),
  http.post('*/api/suivi/messages', async ({ request }) => {
    const corps = (await request.json()) as AccesSuivi & { texte: string }
    if (!accesValide(corps)) return lienInvalide()
    etat.demande.messages.push({ auteur: 'CLIENT', signature: null, texte: corps.texte, le: '2027-01-11T09:00:00.000Z' })
    return HttpResponse.json(etat.demande)
  }),
  http.post('*/api/suivi/annuler', async ({ request }) => {
    const corps = (await request.json()) as AccesSuivi & { motif?: string }
    if (!accesValide(corps)) return lienInvalide()
    if (!etat.demande.peutAnnuler) return HttpResponse.json({ message: 'Cette demande est déjà close.' }, { status: 409 })
    etat.annulations.push({ motif: corps.motif })
    etat.demande = { ...etat.demande, statut: 'ANNULEE', peutAnnuler: false }
    return HttpResponse.json(etat.demande)
  }),
)

beforeAll(async () => {
  serveur.listen({ onUnhandledRequest: 'error' })
  await import('./SuiviPage') // page chargée à la demande : prête avant le premier test
})
afterAll(() => serveur.close())
beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Object.assign(etat, { demande: demandeDeTest(), demandesDeLien: [], annulations: [] })
})
afterEach(() => {
  cleanup()
  serveur.resetHandlers()
})

function ouvrir(hash: string) {
  window.location.hash = hash
  render(
    <QueryClientProvider client={creerClientRequetes({ essais: 0 })}>
      <App />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('avec le lien personnel', () => {
  it('affiche la demande et l’étape en cours', async () => {
    ouvrir(`#/suivi/${REFERENCE}/${JETON}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonjour Camille' })).toBeTruthy()
    const etapes = screen.getAllByRole('listitem').filter((li) => li.classList.contains('suivi-etape'))
    expect(etapes.map((e) => e.querySelector('strong')?.textContent)).toEqual(['Demande reçue', 'En cours d’étude', 'Séjour confirmé'])
    expect(etapes[0].getAttribute('aria-current')).toBe('step')
    const recap = screen.getByRole('region', { name: 'Votre demande' }).textContent ?? ''
    expect(recap).toContain('samedi 15 mai 2027 — Rennes')
    expect(recap).toContain(REFERENCE)
  })

  it('séjour confirmé : étapes passées cochées, annulation remplacée par une invitation à écrire', async () => {
    etat.demande = demandeDeTest('CONFIRMEE')
    ouvrir(`#/suivi/${REFERENCE}/${JETON}`)
    await screen.findByRole('heading', { name: 'Bonjour Camille' })
    expect(document.querySelectorAll('.suivi-etape-faite')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Annuler ma demande' })).toBeNull()
    expect(screen.getByText(/Pour le modifier ou l'annuler, écrivez à Vanlife/)).toBeTruthy()
  })

  it('lien incorrect ou expiré : explication et formulaire pour recevoir un nouveau lien (référence pré-remplie)', async () => {
    const user = ouvrir(`#/suivi/${REFERENCE}/mauvais-secret`)
    expect(await screen.findByRole('heading', { name: 'Lien de suivi expiré ou incorrect' })).toBeTruthy()
    expect((screen.getByLabelText('Référence de la demande') as HTMLInputElement).value).toBe(REFERENCE)
    await user.type(screen.getByLabelText('Adresse e-mail utilisée pour la demande'), 'camille@exemple.fr')
    await user.click(screen.getByRole('button', { name: 'Recevoir le lien par e-mail' }))
    expect(await screen.findByText(MESSAGE_LIEN_ENVOYE)).toBeTruthy()
    expect(etat.demandesDeLien).toEqual([{ reference: REFERENCE, email: 'camille@exemple.fr' }])
  })
})

describe('lien perdu (#/suivi)', () => {
  it('champs vides : messages d’erreur, rien n’est envoyé', async () => {
    const user = ouvrir('#/suivi')
    await user.click(await screen.findByRole('button', { name: 'Recevoir le lien par e-mail' }))
    expect(screen.getByText('Indiquez la référence de votre demande (ex. VL-2027-0042).')).toBeTruthy()
    expect(screen.getByText("Indiquez l'adresse e-mail utilisée pour la demande.")).toBeTruthy()
    expect(etat.demandesDeLien).toEqual([])
  })

  it('réponse identique quelle que soit la référence : le lien n’arrive que par e-mail', async () => {
    const user = ouvrir('#/suivi')
    await user.type(await screen.findByLabelText('Référence de la demande'), 'VL-2027-9999')
    await user.type(screen.getByLabelText('Adresse e-mail utilisée pour la demande'), 'qui@exemple.fr')
    await user.click(screen.getByRole('button', { name: 'Recevoir le lien par e-mail' }))
    expect(await screen.findByText(MESSAGE_LIEN_ENVOYE)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Bonjour/ })).toBeNull()
  })
})

describe('messages', () => {
  it('le client écrit à Vanlife ; le message s’affiche dans l’échange', async () => {
    const user = ouvrir(`#/suivi/${REFERENCE}/${JETON}`)
    const champ = await screen.findByLabelText('Votre message')
    expect((screen.getByRole('button', { name: 'Envoyer le message' }) as HTMLButtonElement).disabled).toBe(true)
    await user.type(champ, 'Peut-on venir avec un chien ?')
    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }))
    expect(await screen.findByText('Message envoyé. Vanlife vous répondra par e-mail.')).toBeTruthy()
    expect(screen.getByText('Peut-on venir avec un chien ?')).toBeTruthy()
    expect((champ as HTMLTextAreaElement).value).toBe('')
  })

  it('affiche la réponse de Vanlife signée du prénom', async () => {
    etat.demande.messages = [{ auteur: 'VANLIFE', signature: 'Claire', texte: 'Oui, avec plaisir !', le: '2027-01-11T09:00:00.000Z' }]
    ouvrir(`#/suivi/${REFERENCE}/${JETON}`)
    const echange = await screen.findByRole('region', { name: 'Échanger avec Vanlife' })
    expect(within(echange).getByText(/Claire · Vanlife/)).toBeTruthy()
    expect(within(echange).getByText('Oui, avec plaisir !')).toBeTruthy()
  })
})

describe('annulation', () => {
  it('demande une confirmation, envoie le motif, puis affiche la demande annulée', async () => {
    const user = ouvrir(`#/suivi/${REFERENCE}/${JETON}`)
    await user.click(await screen.findByRole('button', { name: 'Annuler ma demande' }))
    expect(etat.annulations).toEqual([]) // rien tant que ce n'est pas confirmé
    expect(document.activeElement).toBe(screen.getByLabelText('Motif (facultatif)'))
    await user.type(screen.getByLabelText('Motif (facultatif)'), 'Changement de dates')
    await user.click(screen.getByRole('button', { name: "Confirmer l'annulation" }))
    expect(await screen.findByText('Demande annulée')).toBeTruthy()
    expect(etat.annulations).toEqual([{ motif: 'Changement de dates' }])
    expect(screen.queryByRole('button', { name: 'Annuler ma demande' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Faire une nouvelle demande' })).toBeTruthy()
  })

  it('« Garder ma demande » referme la confirmation sans rien envoyer', async () => {
    const user = ouvrir(`#/suivi/${REFERENCE}/${JETON}`)
    await user.click(await screen.findByRole('button', { name: 'Annuler ma demande' }))
    await user.click(screen.getByRole('button', { name: 'Garder ma demande' }))
    expect(screen.getByRole('button', { name: 'Annuler ma demande' })).toBeTruthy()
    expect(etat.annulations).toEqual([])
  })

  it('refus du serveur : message affiché', async () => {
    const user = ouvrir(`#/suivi/${REFERENCE}/${JETON}`)
    await screen.findByRole('button', { name: 'Annuler ma demande' })
    etat.demande.peutAnnuler = false // Vanlife a confirmé entre-temps
    await user.click(screen.getByRole('button', { name: 'Annuler ma demande' }))
    await user.click(screen.getByRole('button', { name: "Confirmer l'annulation" }))
    expect(await screen.findByText('Cette demande est déjà close.')).toBeTruthy()
  })
})
