// Navigation entre pages par l'adresse après le « # » (aucune bibliothèque, aucun réglage
// d'hébergement nécessaire). Deux sortes d'adresses :
//   « #/demande »  → une PAGE (commence par « #/ ») ;
//   « #programme » → une SECTION de la page d'accueil (ancre classique).
// Le back-office a ses propres adresses sous « #/admin » (ex. « #/admin/demandes/VL-2027-0001 »).

export type Page = 'accueil' | 'demande' | 'suivi' | 'admin'

export const ROUTE_ACCUEIL = '#/'
export const ROUTE_DEMANDE = '#/demande'
export const ROUTE_ADMIN = '#/admin'
/** Espace client ; avec un lien personnel : « #/suivi/VL-2027-0001/<secret> ». */
export const ROUTE_SUIVI = '#/suivi'

export interface Position {
  page: Page
  /** Section à afficher (id HTML), le cas échéant. */
  ancre?: string
  /** Back-office et suivi : chemin après « #/admin » ou « #/suivi » (« / », « /departs », « /VL-2027-0001/… »). */
  chemin?: string
}

/** Traduit l'adresse (window.location.hash) en page à afficher. */
export function lireRoute(hash: string): Position {
  if (hash.startsWith('#/')) {
    const adresse = hash.replace(/\/+$/, '')
    for (const [route, page] of [[ROUTE_ADMIN, 'admin'], [ROUTE_SUIVI, 'suivi']] as const) {
      if (adresse === route || adresse.startsWith(`${route}/`)) return { page, chemin: adresse.slice(route.length) || '/' }
    }
    return { page: adresse === ROUTE_DEMANDE ? 'demande' : 'accueil' }
  }
  const ancre = hash.replace(/^#/, '')
  return ancre ? { page: 'accueil', ancre } : { page: 'accueil' }
}
