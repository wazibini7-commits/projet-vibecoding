// Appels au serveur Vanlife (backend/). Toutes les requêtes passent par ici.
// En développement, Vite redirige /api vers le serveur (voir vite.config.ts) ;
// en production, VITE_API_URL peut indiquer une autre adresse (ex. https://api.vanlife.bzh/api).
import type {
  DemandeReservation, DepartDisponible, EntreeDemande, ErreursServeur, Sejour, SuiviDemande,
} from '../domain/types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

/** Le serveur n'a pas pu être joint, ou a répondu par une erreur inattendue. */
export class ErreurApi extends Error {
  constructor(message: string, readonly statut?: number) {
    super(message)
    this.name = 'ErreurApi'
  }
}

export const MESSAGE_SERVEUR_INJOIGNABLE =
  'Le serveur Vanlife ne répond pas. Vérifiez votre connexion internet puis réessayez.'

function adresse(chemin: string): string {
  // Adresse absolue : exigée par fetch hors navigateur (tests), sans effet dans le navigateur.
  return new URL(`${BASE}${chemin}`, window.location.origin).toString()
}

async function appeler(chemin: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(adresse(chemin), {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch {
    throw new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE)
  }
}

async function lireJson<T>(reponse: Response): Promise<T> {
  try {
    return (await reponse.json()) as T
  } catch {
    throw new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, reponse.status)
  }
}

/** GET qui doit réussir (200) ; sinon ErreurApi avec le message du serveur s'il y en a un. */
async function lire<T>(chemin: string): Promise<T> {
  const reponse = await appeler(chemin)
  if (!reponse.ok) {
    const corps = await lireJson<{ message?: string }>(reponse).catch(() => ({ message: undefined }))
    throw new ErreurApi(corps.message ?? MESSAGE_SERVEUR_INJOIGNABLE, reponse.status)
  }
  return lireJson<T>(reponse)
}

export const lireSejour = (id: string) => lire<Sejour>(`/sejours/${encodeURIComponent(id)}`)

export const lireDeparts = (id: string) => lire<DepartDisponible[]>(`/sejours/${encodeURIComponent(id)}/departs`)

export type ResultatEnvoi =
  | { ok: true; demande: DemandeReservation }
  /** Demande refusée par les règles (400) ou par les places disponibles (409) : erreurs par champ. */
  | { ok: false; erreurs: ErreursServeur; departIndisponible: boolean }

/** Envoie la demande. Les refus « métier » sont des résultats ; les pannes lèvent une ErreurApi. */
export async function envoyerDemande(entree: EntreeDemande): Promise<ResultatEnvoi> {
  const reponse = await appeler('/demandes', { method: 'POST', body: JSON.stringify(entree) })
  if (reponse.status === 201) return { ok: true, demande: await lireJson<DemandeReservation>(reponse) }
  if (reponse.status === 400 || reponse.status === 409) {
    const corps = await lireJson<{ erreurs?: ErreursServeur; message?: string }>(reponse)
    if (corps.erreurs) return { ok: false, erreurs: corps.erreurs, departIndisponible: reponse.status === 409 }
  }
  if (reponse.status === 429) {
    throw new ErreurApi('Trop de demandes envoyées depuis votre connexion. Réessayez dans une minute.', 429)
  }
  throw new ErreurApi("Votre demande n'a pas pu être enregistrée. Réessayez dans quelques instants.", reponse.status)
}

/** Suivi d'une demande ; null si la référence et l'e-mail ne correspondent à aucune demande. */
export async function suivreDemande(reference: string, email: string): Promise<SuiviDemande | null> {
  const reponse = await appeler('/demandes/suivi', { method: 'POST', body: JSON.stringify({ reference, email }) })
  if (reponse.status === 404) return null
  if (!reponse.ok) throw new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, reponse.status)
  return lireJson<SuiviDemande>(reponse)
}
