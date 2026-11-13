// @vitest-environment jsdom
// Tests d'interaction du parcours complet (React Testing Library), avec un faux serveur (MSW) :
// accueil → page « Demande de réservation » (#/demande) → récapitulatif → envoi au serveur → confirmation.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { creerClientRequetes } from '../api/requetes'
import { MENTION_DEMO } from '../data/sejour'
import { MARQUE } from '../data/marque'
import { MESSAGES } from '../domain/validation'
import { formaterDateFr } from '../utils/dates'
import { ROUTE_DEMANDE } from '../utils/navigation'
import {
  DEPART, DEPART_COMPLET, DEPART_SUIVANT, etat, pannes, reinitialiserEtat, serveur,
} from '../test/serveurFactice'
import { ajouterJours } from '../utils/dates'

const RETOUR = ajouterJours(DEPART, 4)
/** Libellé d'un départ dans la liste : « samedi 17 avril · 2 vans libres » (année dans le titre du mois). */
const option = (iso: string, places: string) => `${formaterDateFr(iso).replace(/ \d{4}$/, '')} · ${places}`

beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }))
afterAll(() => serveur.close())
beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo // non implémentés par jsdom
  Element.prototype.scrollIntoView = vi.fn()
  window.location.hash = ''
  reinitialiserEtat()
})
afterEach(() => {
  cleanup()
  serveur.resetHandlers()
})

/** Rend l'application avec un cache neuf (aucun nouvel essai automatique : les pannes s'affichent tout de suite). */
function rendreApp() {
  render(
    <QueryClientProvider client={creerClientRequetes({ essais: 0 })}>
      <App />
    </QueryClientProvider>,
  )
}

/** Ouvre directement la page de demande et attend le chargement des départs. */
async function demarrer() {
  const user = userEvent.setup()
  window.location.hash = ROUTE_DEMANDE
  rendreApp()
  await screen.findByLabelText('Prénom', {}, { timeout: 3000 })
  return {
    user,
    prenom: () => screen.getByLabelText('Prénom') as HTMLInputElement,
    email: () => screen.getByLabelText('Adresse e-mail') as HTMLInputElement,
    date: () => screen.getByLabelText('Date de départ souhaitée') as HTMLSelectElement,
    verifier: () => user.click(screen.getByRole('button', { name: 'Vérifier ma demande' })),
    envoyer: () => user.click(screen.getByRole('button', { name: 'Envoyer ma demande' })),
  }
}

type Parcours = Awaited<ReturnType<typeof demarrer>>

async function remplir(p: Parcours, valeurs: { prenom?: string; email?: string; date?: string }) {
  if (valeurs.prenom !== undefined) { await p.user.clear(p.prenom()); if (valeurs.prenom) await p.user.type(p.prenom(), valeurs.prenom) }
  if (valeurs.email !== undefined) { await p.user.clear(p.email()); if (valeurs.email) await p.user.type(p.email(), valeurs.email) }
  if (valeurs.date !== undefined) await p.user.selectOptions(p.date(), valeurs.date)
}

async function jusquAuRecap() {
  const p = await demarrer()
  await remplir(p, { prenom: 'Camille', email: 'camille@exemple.fr', date: DEPART })
  await p.verifier()
  return p
}

describe('Page principale', () => {
  it('présente d’abord la marque Vanlife, puis son séjour pilote chargé depuis le serveur', async () => {
    rendreApp()
    // La marque s'affiche sans attendre le serveur.
    expect(screen.getByRole('heading', { level: 1, name: MARQUE.signature })).toBeTruthy()
    expect(screen.getAllByText(MARQUE.nom).length).toBeGreaterThan(0)
    expect(screen.getByRole('status').textContent).toContain('Chargement du séjour')
    expect(await screen.findByRole('heading', { level: 2, name: 'Bretagne Sauvage' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Découvrir Bretagne Sauvage' }).getAttribute('href')).toBe('#sejour')
    for (const lien of screen.getAllByRole('link', { name: 'Faire une demande' })) expect(lien.getAttribute('href')).toBe(ROUTE_DEMANDE)
  })

  it('chaque photo du programme et de la galerie a une alternative textuelle', async () => {
    rendreApp()
    const programme = await screen.findByRole('region', { name: /programme en 5 jours/i })
    const photos = within(programme).getAllByRole('img')
    expect(photos).toHaveLength(5)
    for (const img of photos) expect(img.getAttribute('alt')?.length).toBeGreaterThan(15)
    expect(within(screen.getByRole('region', { name: /en images/i })).getAllByRole('button', { name: /Agrandir/ })).toHaveLength(8)
  })

  it('affiche la mention de démonstration, le programme, le prix et les prestations', async () => {
    rendreApp()
    expect(screen.getByText(MENTION_DEMO)).toBeTruthy()
    const programme = await screen.findByRole('region', { name: /programme en 5 jours/i })
    expect(within(programme).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getAllByText(/1\s390\s€/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Inclus dans le prix' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'À prévoir en plus' })).toBeTruthy()
  })

  it('serveur injoignable : message clair, la marque reste visible, « Réessayer » recharge le séjour', async () => {
    serveur.use(pannes.sejourInjoignable())
    rendreApp()
    expect(await screen.findByText('Le séjour ne peut pas être affiché pour le moment.')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: MARQUE.signature })).toBeTruthy()
    serveur.resetHandlers() // le serveur répond de nouveau
    await userEvent.setup().click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Bretagne Sauvage' })).toBeTruthy()
  })
})

describe('Choix du départ', () => {
  it('propose les départs du serveur avec les places restantes ; un départ complet n’est pas sélectionnable', async () => {
    const p = await demarrer()
    const options = within(p.date()).getAllByRole('option') as HTMLOptionElement[]
    expect(options.map((o) => o.textContent)).toEqual([
      'Choisissez un départ',
      option(DEPART, '2 vans libres'),
      option(DEPART_COMPLET, 'complet'),
      option(DEPART_SUIVANT, 'dernier van'),
    ])
    expect(options[2].disabled).toBe(true)
  })

  it('aucun départ ouvert : le formulaire est remplacé par un message', async () => {
    etat.departs = etat.departs.filter((d) => d.complet)
    window.location.hash = ROUTE_DEMANDE
    rendreApp()
    expect(await screen.findByText("Aucun départ n'est ouvert à la réservation pour le moment.")).toBeTruthy()
    expect(screen.queryByLabelText('Prénom')).toBeNull()
  })

  it('départs injoignables : message d’erreur et bouton « Réessayer »', async () => {
    serveur.use(pannes.departsInjoignables())
    window.location.hash = ROUTE_DEMANDE
    rendreApp()
    expect(await screen.findByText("Impossible d'afficher le formulaire de demande.")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy()
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

  it('l’erreur disparaît dès que le champ est corrigé', async () => {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@exemple', date: DEPART })
    await p.verifier()
    await p.user.type(p.email(), '.fr')
    expect(screen.queryByText(MESSAGES.emailMalForme)).toBeNull()
    expect(p.email().getAttribute('aria-invalid')).toBeNull()
  })

  it('l’erreur de date disparaît dès qu’un départ est choisi', async () => {
    const p = await demarrer()
    await p.verifier()
    await remplir(p, { date: DEPART })
    expect(screen.queryByText(MESSAGES.dateVide)).toBeNull()
  })

  it('erreur affichée en quittant un champ mal rempli', async () => {
    const p = await demarrer()
    await p.user.type(p.email(), 'pas-un-email')
    await p.user.tab()
    expect(screen.getByText(MESSAGES.emailMalForme)).toBeTruthy()
  })
})

describe('Formulaire invalide : envoi impossible, saisie conservée', () => {
  it('aucun récapitulatif, et rien n’est envoyé au serveur, tant que la saisie est invalide', async () => {
    const p = await demarrer()
    await remplir(p, { prenom: 'Camille', email: 'camille@', date: DEPART })
    await p.verifier()
    expect(screen.queryByRole('heading', { name: 'Vérifiez votre demande' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Envoyer ma demande' })).toBeNull()
    expect(etat.demandesRecues).toEqual([])
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

describe('Récapitulatif puis envoi au serveur', () => {
  it('le récapitulatif reprend le circuit, les dates et les coordonnées, sans encore rien envoyer', async () => {
    await jusquAuRecap()
    const recap = screen.getByRole('heading', { name: 'Vérifiez votre demande' }).closest('.recap') as HTMLElement
    const texte = recap.textContent ?? ''
    expect(texte).toContain('Bretagne Sauvage — 5 jours / 4 nuits')
    expect(texte).toContain(formaterDateFr(DEPART))
    expect(texte).toContain(formaterDateFr(RETOUR))
    expect(texte).toContain('Camille')
    expect(texte).toContain('camille@exemple.fr')
    expect(texte).toMatch(/transmise à Vanlife/)
    expect(document.activeElement?.textContent).toBe('Vérifiez votre demande')
    expect(etat.demandesRecues).toEqual([])
  })

  it('« Modifier » revient au formulaire avec la saisie conservée', async () => {
    const p = await jusquAuRecap()
    await p.user.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(p.prenom().value).toBe('Camille')
    expect(p.email().value).toBe('camille@exemple.fr')
    expect(p.date().value).toBe(DEPART)
    expect(document.activeElement).toBe(p.prenom())
  })

  it('l’envoi transmet la demande au serveur et affiche sa référence', async () => {
    const p = await jusquAuRecap()
    await p.envoyer()
    const titre = await screen.findByRole('heading', { level: 1, name: /Merci Camille, votre demande est enregistrée/ })
    expect(document.activeElement).toBe(titre)
    expect(etat.demandesRecues).toEqual([
      { sejourId: 'bretagne-sauvage', prenom: 'Camille', email: 'camille@exemple.fr', dateDepart: DEPART },
    ])
    const texte = document.body.textContent ?? ''
    expect(texte).toContain('Demande reçue — réservation à confirmer')
    expect(texte).toContain('VL-2027-0001')
    expect(texte).toContain(formaterDateFr(DEPART))
    expect(texte).toContain(formaterDateFr(RETOUR))
    expect(texte).toContain('Bretagne Sauvage')
    expect(texte).toMatch(/Ce n'est pas encore une réservation/)
    expect(texte).not.toMatch(/simul/i)
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('départ devenu complet entre-temps : retour au formulaire, erreur sur la date, liste mise à jour', async () => {
    const p = await jusquAuRecap()
    // Quelqu'un d'autre prend la dernière place pendant que Camille vérifie sa demande.
    const depart = etat.departs.find((d) => d.date === DEPART)!
    Object.assign(depart, { placesRestantes: 0, complet: true })
    await p.envoyer()
    expect(await screen.findByText('Ce départ est complet. Choisissez une autre date.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('alert'))
    expect(p.prenom().value).toBe('Camille')
    const optionComplete = within(p.date()).getByRole('option', { name: option(DEPART, 'complet') }) as HTMLOptionElement
    expect(optionComplete.disabled).toBe(true)
    // Camille choisit un autre départ et envoie à nouveau.
    await remplir(p, { date: DEPART_SUIVANT })
    await p.verifier()
    await p.envoyer()
    expect(await screen.findByRole('heading', { level: 1, name: /votre demande est enregistrée/ })).toBeTruthy()
  })

  it.each([
    ['serveur injoignable', pannes.envoiInjoignable, /Le serveur Vanlife ne répond pas/],
    ['erreur du serveur', pannes.envoiErreurServeur, /n'a pas pu être enregistrée/],
    ['trop de demandes', pannes.tropDeDemandes, /Réessayez dans une minute/],
  ])('%s : message clair, on reste sur le récapitulatif et on peut réessayer', async (_cas, panne, message) => {
    const p = await jusquAuRecap()
    serveur.use(panne())
    await p.envoyer()
    const alerte = await screen.findByRole('alert')
    expect(alerte.textContent).toContain("Votre demande n'a pas été envoyée.")
    expect(alerte.textContent).toMatch(message)
    expect(document.activeElement).toBe(alerte)
    expect(screen.getByRole('heading', { name: 'Vérifiez votre demande' })).toBeTruthy()
    // La panne est passée : le même bouton fonctionne.
    await p.envoyer()
    expect(await screen.findByRole('heading', { level: 1, name: /votre demande est enregistrée/ })).toBeTruthy()
  })

  it('« Retour au circuit » ramène à la page principale ; une nouvelle demande repart d’un formulaire vierge', async () => {
    const p = await jusquAuRecap()
    await p.envoyer()
    await p.user.click(await screen.findByRole('button', { name: 'Retour au circuit' }))
    expect(await screen.findByRole('heading', { level: 1, name: MARQUE.signature })).toBeTruthy()
    expect(screen.queryByLabelText('Prénom')).toBeNull() // le formulaire n'est plus sur l'accueil
    await p.user.click((await screen.findAllByRole('link', { name: 'Faire une demande' }))[0])
    expect(((await screen.findByLabelText('Prénom')) as HTMLInputElement).value).toBe('')
    // Les places ont été rechargées : il ne reste qu'un van sur le départ choisi.
    expect(within(p.date()).getByRole('option', { name: option(DEPART, 'dernier van') })).toBeTruthy()
  })
})

describe('Navigation entre l’accueil et la page de demande', () => {
  it('le formulaire n’est pas sur l’accueil ; le bouton « Demande » du menu ouvre sa page', async () => {
    const user = userEvent.setup()
    rendreApp()
    expect(screen.queryByLabelText('Prénom')).toBeNull()
    await user.click(screen.getByRole('link', { name: 'Demande' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Demande de réservation' })).toBeTruthy()
    expect(window.location.hash).toBe(ROUTE_DEMANDE)
    expect(await screen.findByLabelText('Prénom')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Demande' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('heading', { level: 1, name: MARQUE.signature })).toBeNull()
  })

  it('la page de demande rappelle le séjour, l’absence d’engagement et la mention de démonstration', async () => {
    await demarrer()
    const resume = screen.getByRole('complementary', { name: /Votre séjour/ })
    expect(resume.textContent).toContain('5 jours / 4 nuits')
    expect(resume.textContent).toContain('Rennes')
    expect(resume.textContent).toMatch(/1\s390\s€/)
    expect(screen.getByText(/Aucun paiement n'est demandé à ce stade/)).toBeTruthy()
    expect(screen.getByText(MENTION_DEMO)).toBeTruthy()
  })

  it('« Retour au séjour » ramène à l’accueil, sur la section du séjour', async () => {
    const p = await demarrer()
    await p.user.click(screen.getByRole('link', { name: '← Retour au séjour' }))
    expect(await screen.findByRole('heading', { level: 1, name: MARQUE.signature })).toBeTruthy()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('l’invitation en bas de l’accueil mène aussi à la page de demande', async () => {
    rendreApp()
    const appel = await screen.findByRole('region', { name: 'Envie de prendre la route ?' })
    expect(within(appel).getByRole('link', { name: 'Faire une demande de réservation' }).getAttribute('href')).toBe(ROUTE_DEMANDE)
  })
})
