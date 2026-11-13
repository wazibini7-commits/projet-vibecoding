// @vitest-environment jsdom
// Tests du back-office (interface) avec un faux serveur d'administration (MSW).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import App from '../App'
import { creerClientRequetes } from '../api/requetes'
import {
  LIBELLES_STATUT, STATUTS, TRANSITIONS,
  type ChangementStatut, type DepartAdmin, type DetailDemande, type Role, type UtilisateurConnecte,
} from '../domain/admin'
import type { StatutDemande } from '../domain/types'

const MOT_DE_PASSE = 'mot de passe solide'

const etat = {
  connecte: null as UtilisateurConnecte | null,
  role: 'ADMIN' as Role,
  demandes: [] as DetailDemande[],
  departs: [] as DepartAdmin[],
  requetesStatut: [] as ChangementStatut[],
  dernieresRecherches: [] as string[],
}

function demande(reference: string, prenom: string, statut: StatutDemande): DetailDemande {
  return {
    reference, statut, creeLe: '2027-01-10T10:00:00.000Z', modifieLe: '2027-01-10T10:00:00.000Z',
    sejour: { id: 'bretagne-sauvage', nom: 'Bretagne Sauvage' }, dateDepart: '2027-05-15', dateRetour: '2027-05-19',
    nombreVoyageurs: 2, prixIndicatif: 1390, message: 'Nous avons un chien.', noteInterne: null,
    client: { prenom, nom: null, email: `${prenom.toLowerCase()}@exemple.fr`, telephone: null },
    historique: [{ ancienStatut: null, nouveauStatut: 'RECUE', le: '2027-01-10T10:00:00.000Z', auteur: null, commentaire: null }],
    emails: [{
      type: 'ACCUSE_RECEPTION', destinataire: `${prenom.toLowerCase()}@exemple.fr`, sujet: 'Votre demande', statut: 'ENVOYE',
      tentatives: 1, creeLe: '2027-01-10T10:00:00.000Z', envoyeLe: '2027-01-10T10:00:05.000Z', derniereErreur: null,
    }],
    transitionsPossibles: TRANSITIONS[statut],
  }
}

const nonConnecte = () => HttpResponse.json({ message: 'Vous devez vous connecter.' }, { status: 401 })
const api = (chemin: string) => `*/api/admin${chemin}`

const serveur = setupServer(
  http.get(api('/moi'), () => (etat.connecte ? HttpResponse.json(etat.connecte) : nonConnecte())),
  http.post(api('/connexion'), async ({ request }) => {
    const { email, motDePasse } = (await request.json()) as { email: string; motDePasse: string }
    if (email !== 'claire@vanlife.example' || motDePasse !== MOT_DE_PASSE) {
      return HttpResponse.json({ message: 'Adresse e-mail ou mot de passe incorrect.' }, { status: 401 })
    }
    etat.connecte = { id: 'u1', email, nom: 'Claire Martin', role: etat.role }
    return HttpResponse.json(etat.connecte)
  }),
  http.post(api('/deconnexion'), () => { etat.connecte = null; return new HttpResponse(null, { status: 204 }) }),
  http.get(api('/demandes'), ({ request }) => {
    if (!etat.connecte) return nonConnecte()
    const url = new URL(request.url)
    const statut = url.searchParams.get('statut')
    const recherche = url.searchParams.get('recherche')?.toLowerCase() ?? ''
    if (recherche) etat.dernieresRecherches.push(recherche)
    const trouvees = etat.demandes.filter((d) => !recherche || d.client.email.includes(recherche) || d.reference.toLowerCase().includes(recherche))
    const compteurs = Object.fromEntries(STATUTS.map((s) => [s, trouvees.filter((d) => d.statut === s).length]))
    const liste = trouvees.filter((d) => !statut || d.statut === statut)
    return HttpResponse.json({
      demandes: liste.map((d) => ({ reference: d.reference, statut: d.statut, creeLe: d.creeLe, dateDepart: d.dateDepart, sejourNom: d.sejour.nom, client: d.client })),
      total: liste.length, page: 1, parPage: 25, compteurs,
    })
  }),
  http.get(api('/demandes/:reference'), ({ params }) => {
    if (!etat.connecte) return nonConnecte()
    const d = etat.demandes.find((x) => x.reference === params.reference)
    return d ? HttpResponse.json(d) : HttpResponse.json({ message: 'Demande introuvable.' }, { status: 404 })
  }),
  http.post(api('/demandes/:reference/statut'), async ({ params, request }) => {
    if (!etat.connecte) return nonConnecte()
    const corps = (await request.json()) as ChangementStatut
    etat.requetesStatut.push(corps)
    const d = etat.demandes.find((x) => x.reference === params.reference)!
    d.historique.push({ ancienStatut: d.statut, nouveauStatut: corps.statut, le: '2027-01-11T09:00:00.000Z', auteur: etat.connecte.nom, commentaire: corps.commentaire || null })
    d.statut = corps.statut
    d.transitionsPossibles = TRANSITIONS[corps.statut]
    return HttpResponse.json(d)
  }),
  http.get(api('/sejours/:id/departs'), () => (etat.connecte ? HttpResponse.json(etat.departs) : nonConnecte())),
  http.patch(api('/departs/:id'), async ({ params, request }) => {
    const modif = (await request.json()) as Partial<DepartAdmin>
    const d = etat.departs.find((x) => x.id === Number(params.id))!
    if (modif.capacite !== undefined && modif.capacite < d.demandesActives) {
      return HttpResponse.json({ message: `Impossible : ${d.demandesActives} demande(s) occupent déjà ce départ.` }, { status: 400 })
    }
    Object.assign(d, modif)
    return HttpResponse.json(d)
  }),
  http.post(api('/mot-de-passe'), async ({ request }) => {
    const { actuel } = (await request.json()) as { actuel: string }
    if (actuel !== MOT_DE_PASSE) return HttpResponse.json({ erreurs: { actuel: 'Le mot de passe actuel est incorrect.' } }, { status: 400 })
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(async () => {
  serveur.listen({ onUnhandledRequest: 'error' })
  await import('./AdminApp') // module chargé à la demande : prêt avant le premier test
})
afterAll(() => serveur.close())
beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Object.assign(etat, {
    connecte: null, role: 'ADMIN', requetesStatut: [], dernieresRecherches: [],
    demandes: [demande('VL-2027-0002', 'Louis', 'EN_ETUDE'), demande('VL-2027-0001', 'Camille', 'RECUE')],
    departs: [
      { id: 1, date: '2099-05-15', capacite: 2, statut: 'OUVERT', demandesActives: 2, demandesConfirmees: 1 },
      { id: 2, date: '2099-05-22', capacite: 2, statut: 'OUVERT', demandesActives: 0, demandesConfirmees: 0 },
    ],
  })
})
afterEach(() => {
  cleanup()
  serveur.resetHandlers()
})

function ouvrir(chemin = '') {
  window.location.hash = `#/admin${chemin}`
  render(
    <QueryClientProvider client={creerClientRequetes({ essais: 0 })}>
      <App />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

async function seConnecter(user: ReturnType<typeof userEvent.setup>, motDePasse = MOT_DE_PASSE) {
  await user.type(await screen.findByLabelText('Adresse e-mail'), 'claire@vanlife.example')
  await user.type(screen.getByLabelText('Mot de passe'), motDePasse)
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('connexion', () => {
  it('personne n’est connecté : page de connexion, sans le menu ni les données', async () => {
    ouvrir()
    expect(await screen.findByRole('heading', { level: 1, name: "Connexion à l'administration" })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Administration' })).toBeNull()
    expect(screen.queryByText('VL-2027-0001')).toBeNull()
  })

  it('mauvais mot de passe : message, mot de passe effacé', async () => {
    const user = ouvrir()
    await seConnecter(user, 'mauvais mot de passe')
    expect(await screen.findByText('Adresse e-mail ou mot de passe incorrect.')).toBeTruthy()
    expect((screen.getByLabelText('Mot de passe') as HTMLInputElement).value).toBe('')
  })

  it('bons identifiants : on arrive sur la liste des demandes, avec son nom et son rôle', async () => {
    const user = ouvrir()
    await seConnecter(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Demandes de réservation' })).toBeTruthy()
    const entete = screen.getByRole('banner')
    expect(entete.textContent).toContain('Claire Martin')
    expect(entete.textContent).toContain('Administrateur')
  })

  it('déconnexion : retour à la page de connexion', async () => {
    const user = ouvrir()
    await seConnecter(user)
    await user.click(await screen.findByRole('button', { name: 'Se déconnecter' }))
    expect(await screen.findByRole('heading', { name: "Connexion à l'administration" })).toBeTruthy()
    expect(etat.connecte).toBeNull()
  })

  it('session expirée pendant le travail : retour à la connexion', async () => {
    etat.connecte = { id: 'u1', email: 'claire@vanlife.example', nom: 'Claire Martin', role: 'ADMIN' }
    const user = ouvrir()
    await screen.findByText('VL-2027-0001')
    etat.connecte = null // le serveur a fermé la session
    await user.click(screen.getByRole('link', { name: 'VL-2027-0001' }))
    expect(await screen.findByRole('heading', { name: "Connexion à l'administration" })).toBeTruthy()
  })

  it('le site public n’affiche pas le bandeau de démonstration dans l’administration', async () => {
    ouvrir()
    await screen.findByRole('heading', { name: "Connexion à l'administration" })
    expect(screen.queryByText(/Version de démonstration/)).toBeNull()
  })
})

describe('liste des demandes', () => {
  beforeEach(() => { etat.connecte = { id: 'u1', email: 'claire@vanlife.example', nom: 'Claire Martin', role: 'ADMIN' } })

  it('affiche les demandes avec leur statut et les compteurs par statut', async () => {
    ouvrir()
    const tableau = await screen.findByRole('table')
    const lignes = within(tableau).getAllByRole('row').slice(1)
    expect(lignes.map((l) => within(l).getAllByRole('cell')[0].textContent)).toEqual(['VL-2027-0002', 'VL-2027-0001'])
    expect(within(lignes[1]).getByText('Reçue')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Toutes\s*2/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /En étude\s*1/ })).toBeTruthy()
  })

  it('filtre par statut', async () => {
    const user = ouvrir()
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: /^Reçue/ }))
    expect(screen.getByRole('button', { name: /^Reçue/ }).getAttribute('aria-pressed')).toBe('true')
    await vi.waitFor(() => expect(screen.queryByText('VL-2027-0002')).toBeNull())
    expect(screen.getByText('VL-2027-0001')).toBeTruthy()
  })

  it('recherche', async () => {
    const user = ouvrir()
    await screen.findByRole('table')
    await user.type(screen.getByLabelText('Rechercher'), 'louis')
    await user.click(screen.getByRole('button', { name: 'Rechercher' }))
    await vi.waitFor(() => expect(screen.queryByText('VL-2027-0001')).toBeNull())
    expect(etat.dernieresRecherches).toEqual(['louis'])
    expect(screen.getByText(/1 demande pour « louis »/)).toBeTruthy()
  })

  it('le bouton d’export pointe vers le fichier CSV avec les filtres en cours', async () => {
    const user = ouvrir()
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: /^En étude/ }))
    expect(screen.getByRole('link', { name: 'Exporter (tableur)' }).getAttribute('href')).toBe('/api/admin/demandes/export.csv?statut=EN_ETUDE')
  })
})

describe('détail d’une demande', () => {
  beforeEach(() => { etat.connecte = { id: 'u1', email: 'claire@vanlife.example', nom: 'Claire Martin', role: 'ADMIN' } })

  it('affiche client, message, historique, e-mails, et seulement les statuts possibles', async () => {
    ouvrir('/demandes/VL-2027-0001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Demande VL-2027-0001' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'camille@exemple.fr' }).getAttribute('href')).toMatch(/^mailto:camille@exemple\.fr/)
    expect(screen.getByText('Nous avons un chien.')).toBeTruthy()
    expect(screen.getByText('Demande reçue')).toBeTruthy()
    expect(screen.getByText(/Envoyé le/)).toBeTruthy()
    const choix = within(screen.getByRole('group', { name: 'Nouveau statut' })).getAllByRole('radio')
    expect(choix.map((c) => c.parentElement?.textContent)).toEqual([
      'Passer en étude', 'Confirmer la réservation', 'Refuser la demande', 'Annuler la demande',
    ])
  })

  it('confirmer avec un commentaire et un e-mail au client', async () => {
    const user = ouvrir('/demandes/VL-2027-0001')
    await user.click(await screen.findByRole('radio', { name: 'Confirmer la réservation' }))
    await user.type(screen.getByLabelText('Commentaire (facultatif)'), 'Rendez-vous à 9 h.')
    expect((screen.getByRole('checkbox', { name: /Informer le client/ }) as HTMLInputElement).checked).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Enregistrer le changement' }))
    expect(await screen.findByText('Statut modifié : Confirmée. Un e-mail est envoyé à camille@exemple.fr.')).toBeTruthy()
    expect(etat.requetesStatut).toEqual([{ statut: 'CONFIRMEE', commentaire: 'Rendez-vous à 9 h.', informerClient: true }])
    expect(screen.getByText('Reçue → Confirmée')).toBeTruthy()
    expect(screen.getByText('« Rendez-vous à 9 h. »')).toBeTruthy()
    // Une demande confirmée ne peut plus qu'être annulée.
    expect(within(screen.getByRole('group', { name: 'Nouveau statut' })).getAllByRole('radio')).toHaveLength(1)
  })

  it('sans informer le client', async () => {
    const user = ouvrir('/demandes/VL-2027-0001')
    await user.click(await screen.findByRole('radio', { name: 'Passer en étude' }))
    await user.click(screen.getByRole('checkbox', { name: /Informer le client/ }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer le changement' }))
    expect(await screen.findByText('Statut modifié : En étude.')).toBeTruthy()
    expect(etat.requetesStatut[0].informerClient).toBe(false)
  })

  it('le bouton reste inactif tant qu’aucun statut n’est choisi', async () => {
    ouvrir('/demandes/VL-2027-0001')
    expect((await screen.findByRole('button', { name: 'Enregistrer le changement' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('demande close : plus de changement possible', async () => {
    etat.demandes[1] = demande('VL-2027-0001', 'Camille', 'REFUSEE')
    ouvrir('/demandes/VL-2027-0001')
    expect(await screen.findByText(/Cette demande est close \(refusée\)/)).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Nouveau statut' })).toBeNull()
  })

  it('référence inconnue : message clair', async () => {
    ouvrir('/demandes/VL-0000-0000')
    expect(await screen.findByText("Impossible d'afficher cette demande.")).toBeTruthy()
    expect(screen.getByText('Demande introuvable.')).toBeTruthy()
  })
})

describe('départs', () => {
  it('administrateur : modifie le statut d’un départ ; une capacité trop basse est refusée avec explication', async () => {
    etat.connecte = { id: 'u1', email: 'claire@vanlife.example', nom: 'Claire Martin', role: 'ADMIN' }
    const user = ouvrir('/departs')
    const statut = await screen.findByRole('combobox', { name: 'Statut du départ du vendredi 22 mai 2099' })
    await user.selectOptions(statut, 'FERME')
    await vi.waitFor(() => expect(etat.departs[1].statut).toBe('FERME'))

    const capacite = screen.getByRole('spinbutton', { name: 'Nombre de vans pour le départ du vendredi 15 mai 2099' })
    await user.clear(capacite)
    await user.type(capacite, '1')
    await user.click(within(capacite.closest('form')!).getByRole('button', { name: 'OK' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Impossible : 2 demande(s) occupent déjà ce départ.')
  })

  it('gestionnaire : consultation seule', async () => {
    etat.connecte = { id: 'u2', email: 'gestion@vanlife.example', nom: 'Léo', role: 'GESTIONNAIRE' }
    ouvrir('/departs')
    expect(await screen.findByText(/Consultation seule/)).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Ajouter un départ' })).toBeNull()
    expect(await screen.findByText('2 / 2 vans')).toBeTruthy()
  })
})

describe('mon compte', () => {
  beforeEach(() => { etat.connecte = { id: 'u1', email: 'claire@vanlife.example', nom: 'Claire Martin', role: 'ADMIN' } })

  it('vérifie la confirmation avant d’envoyer, puis affiche l’erreur du serveur sous le bon champ', async () => {
    const user = ouvrir('/compte')
    await user.type(await screen.findByLabelText('Mot de passe actuel'), 'faux mot de passe')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'nouvelle phrase secrète')
    await user.type(screen.getByLabelText('Confirmez le nouveau mot de passe'), 'autre chose')
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(screen.getByText('Les deux mots de passe ne sont pas identiques.')).toBeTruthy()

    await user.clear(screen.getByLabelText('Confirmez le nouveau mot de passe'))
    await user.type(screen.getByLabelText('Confirmez le nouveau mot de passe'), 'nouvelle phrase secrète')
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(await screen.findByText('Le mot de passe actuel est incorrect.')).toBeTruthy()
  })
})

it('libellés : chaque statut a un libellé', () => {
  for (const s of STATUTS) expect(LIBELLES_STATUT[s].length).toBeGreaterThan(0)
})
