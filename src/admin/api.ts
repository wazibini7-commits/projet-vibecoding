// Appels à l'API du back-office (/api/admin). La session est dans un cookie httpOnly envoyé
// automatiquement par le navigateur : le JavaScript n'a jamais accès au jeton.
import type {
  ChangementStatut, DepartAdmin, DetailDemande, FiltresDemandes, ModificationDepart, NouveauDepart, PageDemandes,
  UtilisateurConnecte,
} from '../domain/admin'
import { ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '../api/client'

const BASE = `${import.meta.env.VITE_API_URL ?? '/api'}/admin`

/** Erreur de l'API d'administration : message affichable tel quel, erreurs par champ éventuelles. */
export class ErreurAdmin extends ErreurApi {
  constructor(message: string, statut?: number, readonly erreurs?: Record<string, string>) {
    super(message, statut)
    this.name = 'ErreurAdmin'
  }
}

/** Appelée quand le serveur répond 401 (session expirée ou fermée) : l'interface revient à la connexion. */
let surSessionPerdue: () => void = () => {}
export function definirSurSessionPerdue(fn: () => void) {
  surSessionPerdue = fn
}

async function appeler<T>(chemin: string, init: RequestInit = {}, options: { ignorer401?: boolean } = {}): Promise<T> {
  let reponse: Response
  try {
    reponse = await fetch(new URL(`${BASE}${chemin}`, window.location.origin), {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch {
    throw new ErreurAdmin(MESSAGE_SERVEUR_INJOIGNABLE)
  }
  if (reponse.status === 204) return undefined as T
  const corps = await reponse.json().catch(() => ({})) as { message?: string; erreurs?: Record<string, string> }
  if (reponse.ok) return corps as T
  if (reponse.status === 401 && !options.ignorer401) surSessionPerdue()
  const message = corps.message
    ?? (corps.erreurs ? 'Merci de corriger les champs signalés.' : `Erreur du serveur (${reponse.status}). Réessayez.`)
  throw new ErreurAdmin(message, reponse.status, corps.erreurs)
}

const envoyer = (methode: string, corps: unknown): RequestInit => ({ method: methode, body: JSON.stringify(corps) })

export function parametres(filtres: FiltresDemandes): string {
  const p = new URLSearchParams()
  if (filtres.statut) p.set('statut', filtres.statut)
  if (filtres.recherche?.trim()) p.set('recherche', filtres.recherche.trim())
  if (filtres.page && filtres.page > 1) p.set('page', String(filtres.page))
  const texte = p.toString()
  return texte ? `?${texte}` : ''
}

export const api = {
  /** Utilisateur connecté, ou null si personne n'est connecté. */
  async moi(): Promise<UtilisateurConnecte | null> {
    try {
      return await appeler<UtilisateurConnecte>('/moi', {}, { ignorer401: true })
    } catch (e) {
      if (e instanceof ErreurAdmin && e.statut === 401) return null
      throw e
    }
  },
  connexion: (email: string, motDePasse: string) =>
    appeler<UtilisateurConnecte>('/connexion', envoyer('POST', { email, motDePasse }), { ignorer401: true }),
  deconnexion: () => appeler<void>('/deconnexion', { method: 'POST' }, { ignorer401: true }),
  changerMotDePasse: (actuel: string, nouveau: string) => appeler<void>('/mot-de-passe', envoyer('POST', { actuel, nouveau })),

  demandes: (filtres: FiltresDemandes) => appeler<PageDemandes>(`/demandes${parametres(filtres)}`),
  demande: (reference: string) => appeler<DetailDemande>(`/demandes/${encodeURIComponent(reference)}`),
  changerStatut: (reference: string, changement: ChangementStatut) =>
    appeler<DetailDemande>(`/demandes/${encodeURIComponent(reference)}/statut`, envoyer('POST', changement)),
  modifierNote: (reference: string, noteInterne: string) =>
    appeler<DetailDemande>(`/demandes/${encodeURIComponent(reference)}/note`, envoyer('PUT', { noteInterne })),
  /** Adresse du fichier CSV (téléchargé directement par le navigateur, avec le cookie de session). */
  adresseExport: (filtres: FiltresDemandes) => `${BASE}/demandes/export.csv${parametres({ ...filtres, page: undefined })}`,

  departs: (sejourId: string) => appeler<DepartAdmin[]>(`/sejours/${encodeURIComponent(sejourId)}/departs`),
  creerDepart: (nouveau: NouveauDepart) => appeler<DepartAdmin>('/departs', envoyer('POST', nouveau)),
  modifierDepart: (id: number, modif: ModificationDepart) => appeler<DepartAdmin>(`/departs/${id}`, envoyer('PATCH', modif)),
}

export const clesAdmin = {
  moi: ['admin', 'moi'] as const,
  demandes: (filtres: FiltresDemandes) => ['admin', 'demandes', filtres] as const,
  toutesDemandes: ['admin', 'demandes'] as const,
  demande: (reference: string) => ['admin', 'demande', reference] as const,
  departs: (sejourId: string) => ['admin', 'departs', sejourId] as const,
}
