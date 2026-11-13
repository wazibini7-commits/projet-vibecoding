// @vitest-environment jsdom
// Tests d'interaction du parcours complet (React Testing Library) :
// accueil → page « Demande de réservation » (#/demande) → récapitulatif → confirmation.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { MENTION_DEMO } from '../data/sejour'
import { MARQUE } from '../data/marque'
import { MESSAGES } from '../domain/validation'
import { ajouterJours, aujourdhuiIso, formaterDateFr } from '../utils/dates'
import { ROUTE_DEMANDE } from '../utils/navigation'

const DEPART = ajouterJours(aujourdhuiIso(), 30)
const RETOUR = ajouterJours(DEPART, 4)

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo // non implémentés par jsdom
  Element.prototype.scrollIntoView = vi.fn()
  window.location.hash = ''
})
afterEach(cleanup)

/** Ouvre directement la page de demande et attend son chargement (page chargée à la demande). */
async function demarrer() {
  const user = userEvent.setup()
  window.location.hash = ROUTE_DEMANDE
  render(<App />)
  await screen.findByLabelText('Prénom')
  return {
    user,
    prenom: () => screen.getByLabelText('Prénom') as HTMLInputElement,
    email: () => screen.getByLabelText('Adresse e-mail') as HTMLInputElement,
    date: () => screen.getByLabelText('Date de départ souhaitée') as HTMLInputElement,
    verifier: () => user.click(screen.getByRole('button', { name: 'Vérifier ma demande' })),
  }
}

async function remplir(p: Awaited<ReturnType<typeof demarrer>>, valeurs: { prenom?: string; email?: string; date?: string }) {
  if (valeurs.prenom !== undefined) { await p.user.clear(p.prenom()); if (valeurs.prenom) await p.user.type(p.prenom(), valeurs.prenom) }
  if (valeurs.email !== undefined) { await p.user.clear(p.email()); if (valeurs.email) await p.user.type(p.email(), valeurs.email) }
  if (valeurs.date !== undefined) { await p.user.clear(p.date()); if (valeurs.date) await p.user.type(p.date(), valeurs.date) }
}

describe('Page principale', () => {
  it('présente d’abord la marque Vanlife, puis son séjour pilote Bretagne Sauvage', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: MARQUE.signature })).toBeTruthy()
    expect(screen.getAllByText(MARQUE.nom).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Bretagne Sauvage' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Découvrir Bretagne Sauvage' }).getAttribute('href')).toBe('#sejour')
    for (const lien of screen.getAllByRole('link', { name: 'Faire une demande' })) expect(lien.getAttribute('href')).toBe(ROUTE_DEMANDE)
  })

  it('chaque photo du programme et de la galerie a une alternative textuelle', () => {
    render(<App />)
    const programme = screen.getByRole('region', { name: /programme en 5 jours/i })
    const photos = within(programme).getAllByRole('img')
    expect(photos).toHaveLength(5)
    for (const img of photos) expect(img.getAttribute('alt')?.length).toBeGreaterThan(15)
    expect(within(screen.getByRole('region', { name: /en images/i })).getAllByRole('button', { name: /Agrandir/ })).toHaveLength(8)
  })

  it('affiche la mention de démonstration, le programme, le prix et les prestations', () => {
    render(<App />)
    expect(screen.getByText(MENTION_DEMO)).toBeTruthy()
    expect(within(screen.getByRole('region', { name: /programme en 5 jours/i })).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getAllByText(/1\s390\s€/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Inclus dans le prix' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'À prévoir en plus' })).toBeTruthy()
  })
})

describe('Erreurs sous les champs concernés', () => {
  it('demande vide : un message sous chaque champ, relié au champ (aria)', async () => {
    const p = await demarrer()
    await p.verifier()
    for (const [champ, message] of [
      [p.prenom(), MESSAGES.prenomVide],
      [p.email(), MESSAGES.emailVide],
      [p.date(), MESSAGES.dateVide],
    ] as const) {
      expect(champ.getAttribute('aria-invalid')).toBe('true')
      const idErreur = champ.getAttribute('aria-describedby')!.split(' ').find((id) => id.endsWith('-erreur'))!
      expect(document.getElementById(idErreur)?.textContent).toBe(message)
    }
    // Résumé en tête de formulaire, focalisé.
    expect(screen.getByRole('alert').textContent).toContain('Merci de corriger les champs suivants')
    expect(document.activeElement).toBe(screen.getByRole('alert'))
  })

  it('e-mail mal formé : seul le champ e-mail est en erreur', async () => {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@exemple', date: DEPART })
    await p.verifier()
    expect(screen.getByText(MESSAGES.emailMalForme)).toBeTruthy()
    expect(p.prenom().getAttribute('aria-invalid')).toBeNull()
    expect(p.date().getAttribute('aria-invalid')).toBeNull()
  })

  it('date passée : refusée avec un message explicite', async () => {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@exemple.fr', date: '2020-01-01' })
    await p.verifier()
    expect(screen.getByText(MESSAGES.datePassee)).toBeTruthy()
  })

  it('l’erreur disparaît dès que le champ est corrigé', async () => {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@exemple', date: DEPART })
    await p.verifier()
    await p.user.type(p.email(), '.fr')
    expect(screen.queryByText(MESSAGES.emailMalForme)).toBeNull()
    expect(p.email().getAttribute('aria-invalid')).toBeNull()
  })

  it('erreur affichée en quittant un champ mal rempli', async () => {
    const p = await demarrer()
    await p.user.type(p.email(), 'pas-un-email')
    await p.user.tab()
    expect(screen.getByText(MESSAGES.emailMalForme)).toBeTruthy()
  })
})

describe('Formulaire invalide : envoi impossible, saisie conservée', () => {
  it('aucun récapitulatif ni confirmation tant que la saisie est invalide', async () => {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@', date: DEPART })
    await p.verifier()
    expect(screen.queryByRole('heading', { name: 'Vérifiez votre demande' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Envoyer ma demande/ })).toBeNull()
    expect(screen.queryByText(/votre demande a bien été simulée/)).toBeNull()
  })

  it('les valeurs saisies sont conservées après une erreur', async () => {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@exemple', date: DEPART })
    await p.verifier()
    expect(p.prenom().value).toBe('Camille')
    expect(p.email().value).toBe('camille@exemple')
    expect(p.date().value).toBe(DEPART)
  })
})

describe('Récapitulatif puis confirmation simulée', () => {
  async function jusquAuRecap() {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@exemple.fr', date: DEPART })
    await p.verifier()
    return p
  }

  it('le récapitulatif reprend le circuit, les dates et les coordonnées, et annonce l’envoi simulé', async () => {
    await jusquAuRecap()
    const recap = screen.getByRole('heading', { name: 'Vérifiez votre demande' }).closest('.recap') as HTMLElement
    const texte = recap.textContent ?? ''
    expect(texte).toContain('Bretagne Sauvage — 5 jours / 4 nuits')
    expect(texte).toContain(formaterDateFr(DEPART))
    expect(texte).toContain(formaterDateFr(RETOUR))
    expect(texte).toContain('Camille')
    expect(texte).toContain('camille@exemple.fr')
    expect(texte).toMatch(/l'envoi est simulé/)
    expect(document.activeElement?.textContent).toBe('Vérifiez votre demande')
  })

  it('« Modifier » revient au formulaire avec la saisie conservée', async () => {
    const p = await jusquAuRecap()
    await p.user.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(p.prenom().value).toBe('Camille')
    expect(p.email().value).toBe('camille@exemple.fr')
    expect(document.activeElement).toBe(p.prenom())
  })

  it('l’envoi affiche la confirmation : circuit, date demandée, envoi simulé, à confirmer', async () => {
    const p = await jusquAuRecap()
    await p.user.click(screen.getByRole('button', { name: /Envoyer ma demande/ }))
    const titre = screen.getByRole('heading', { level: 1, name: /Merci Camille, votre demande a bien été simulée/ })
    expect(document.activeElement).toBe(titre)
    const texte = document.body.textContent ?? ''
    expect(texte).toContain('Demande simulée — réservation à confirmer')
    expect(texte).toMatch(/Ceci est un envoi simulé/)
    expect(texte).toContain('La réservation reste à confirmer par Vanlife')
    expect(texte).toContain(formaterDateFr(DEPART))
    expect(texte).toContain('Bretagne Sauvage')
    expect(texte).toMatch(/DEMO-[A-Z0-9]{6}/)
    expect(texte).toContain(MENTION_DEMO)
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('« Retour au circuit » ramène à la page principale avec un formulaire vierge', async () => {
    const p = await jusquAuRecap()
    await p.user.click(screen.getByRole('button', { name: /Envoyer ma demande/ }))
    await p.user.click(screen.getByRole('button', { name: 'Retour au circuit' }))
    expect(await screen.findByRole('heading', { level: 1, name: MARQUE.signature })).toBeTruthy()
    expect(screen.queryByLabelText('Prénom')).toBeNull() // le formulaire n'est plus sur l'accueil
    // Nouvelle demande : formulaire vierge.
    await p.user.click(screen.getAllByRole('link', { name: 'Faire une demande' })[0])
    expect(((await screen.findByLabelText('Prénom')) as HTMLInputElement).value).toBe('')
  })
})

describe('Navigation entre l’accueil et la page de demande', () => {
  it('le formulaire n’est pas sur l’accueil ; le bouton « Demande » du menu ouvre sa page', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByLabelText('Prénom')).toBeNull()
    await user.click(screen.getByRole('link', { name: 'Demande' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Demande de réservation' })).toBeTruthy()
    expect(window.location.hash).toBe(ROUTE_DEMANDE)
    expect(screen.getByLabelText('Prénom')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Demande' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('heading', { level: 1, name: MARQUE.signature })).toBeNull()
  })

  it('la page de demande rappelle le séjour, l’envoi simulé et la mention de démonstration', async () => {
    await demarrer()
    const resume = screen.getByRole('complementary', { name: /Votre séjour/ })
    expect(resume.textContent).toContain('5 jours / 4 nuits')
    expect(resume.textContent).toContain('Rennes')
    expect(resume.textContent).toMatch(/1\s390\s€/)
    expect(screen.getByText(/aucune réservation n'est enregistrée/)).toBeTruthy()
    expect(screen.getByText(MENTION_DEMO)).toBeTruthy()
  })

  it('« Retour au séjour » ramène à l’accueil, sur la section du séjour', async () => {
    const p = await demarrer()
    await p.user.click(screen.getByRole('link', { name: '← Retour au séjour' }))
    expect(await screen.findByRole('heading', { level: 1, name: MARQUE.signature })).toBeTruthy()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('l’invitation en bas de l’accueil mène aussi à la page de demande', async () => {
    render(<App />)
    const appel = screen.getByRole('region', { name: 'Envie de prendre la route ?' })
    expect(within(appel).getByRole('link', { name: 'Faire une demande de réservation' }).getAttribute('href')).toBe(ROUTE_DEMANDE)
  })
})
