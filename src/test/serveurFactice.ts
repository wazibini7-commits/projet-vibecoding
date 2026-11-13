// Faux serveur Vanlife pour les tests de l'interface (MSW intercepte les appels fetch).
// Il reproduit le comportement de l'API réelle (backend/) : mêmes adresses, mêmes formats,
// mêmes règles principales (validation partagée, départ existant, places restantes).
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { SEJOUR_BRETAGNE_SAUVAGE } from '../data/sejour'
import { validerDemande } from '../domain/validation'
import type { DemandeEnregistree, DepartDisponible, EntreeDemande } from '../domain/types'
import { ajouterJours, aujourdhuiIso } from '../utils/dates'

export const SEJOUR = SEJOUR_BRETAGNE_SAUVAGE

/** Départs de test : dans 30, 37 (complet) et 44 jours. */
export const DEPART = ajouterJours(aujourdhuiIso(), 30)
export const DEPART_COMPLET = ajouterJours(aujourdhuiIso(), 37)
export const DEPART_SUIVANT = ajouterJours(aujourdhuiIso(), 44)

interface EtatServeur {
  departs: DepartDisponible[]
  demandesRecues: EntreeDemande[]
}

export const etat: EtatServeur = { departs: [], demandesRecues: [] }

export function reinitialiserEtat() {
  const depart = (date: string, placesRestantes: number): DepartDisponible =>
    ({ date, dateRetour: ajouterJours(date, 4), placesRestantes, complet: placesRestantes === 0 })
  etat.departs = [depart(DEPART, 2), depart(DEPART_COMPLET, 0), depart(DEPART_SUIVANT, 1)]
  etat.demandesRecues = []
}

const api = (chemin: string) => `*/api${chemin}`

export const serveur = setupServer(
  http.get(api('/sejours/:id'), ({ params }) =>
    params.id === SEJOUR.id ? HttpResponse.json(SEJOUR) : HttpResponse.json({ message: 'Séjour introuvable.' }, { status: 404 })),

  http.get(api('/sejours/:id/departs'), () => HttpResponse.json(etat.departs)),

  http.post(api('/demandes'), async ({ request }) => {
    const entree = (await request.json()) as EntreeDemande
    etat.demandesRecues.push(entree)
    const validation = validerDemande(entree)
    if (!validation.valide) return HttpResponse.json({ erreurs: validation.erreurs }, { status: 400 })
    const depart = etat.departs.find((d) => d.date === validation.donnees.dateDepart)
    if (!depart) {
      return HttpResponse.json({ erreurs: { dateDepart: "Aucun départ n'est proposé à cette date." } }, { status: 400 })
    }
    if (depart.complet) {
      return HttpResponse.json({ erreurs: { dateDepart: 'Ce départ est complet. Choisissez une autre date.' } }, { status: 409 })
    }
    depart.placesRestantes -= 1
    depart.complet = depart.placesRestantes === 0
    const demande: DemandeEnregistree = {
      reference: `VL-2027-${String(etat.demandesRecues.length).padStart(4, '0')}`,
      statut: 'RECUE',
      creeeLe: new Date().toISOString(),
      sejour: {
        id: SEJOUR.id, nom: SEJOUR.nom, jours: SEJOUR.duree.jours, nuits: SEJOUR.duree.nuits,
        nombreVoyageurs: SEJOUR.nombreVoyageurs, villeDepart: SEJOUR.villeDepart, villeRetour: SEJOUR.villeRetour,
        prixIndicatif: SEJOUR.prix.montant,
      },
      voyageur: { prenom: validation.donnees.prenom, email: validation.donnees.email.toLowerCase() },
      dateDepart: depart.date,
      dateRetour: depart.dateRetour,
      jetonSuivi: 'secret-de-test',
    }
    return HttpResponse.json(demande, { status: 201 })
  }),
)

/** Gestionnaires de remplacement pour simuler des pannes dans un test. */
export const pannes = {
  sejourInjoignable: () => http.get(api('/sejours/:id'), () => HttpResponse.error()),
  departsInjoignables: () => http.get(api('/sejours/:id/departs'), () => HttpResponse.error()),
  envoiInjoignable: () => http.post(api('/demandes'), () => HttpResponse.error(), { once: true }),
  envoiErreurServeur: () =>
    http.post(api('/demandes'), () => HttpResponse.json({ message: 'Erreur interne du serveur.' }, { status: 500 }), { once: true }),
  tropDeDemandes: () =>
    http.post(api('/demandes'), () => HttpResponse.json({ message: 'Trop de demandes' }, { status: 429 }), { once: true }),
}
