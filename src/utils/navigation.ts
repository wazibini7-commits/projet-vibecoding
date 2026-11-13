// Navigation entre pages par l'adresse après le « # » (aucune bibliothèque, aucun réglage
// d'hébergement nécessaire). Deux sortes d'adresses :
//   « #/demande »  → une PAGE (commence par « #/ ») ;
//   « #programme » → une SECTION de la page d'accueil (ancre classique).
// Le back-office a ses propres adresses sous « #/admin » (ex. « #/admin/demandes/VL-2027-0001 »).

export type Page = 'accueil' | 'demande' | 'admin'

export const ROUTE_ACCUEIL = '#/'
export const ROUTE_DEMANDE = '#/demande'
export const ROUTE_ADMIN = '#/admin'

export interface Position {
  page: Page
  /** Section à afficher (id HTML), le cas échéant. */
  ancre?: string
  /** Back-office : chemin après « #/admin » (« / », « /departs », « /demandes/VL-2027-0001 »…). */
  chemin?: string
}

/** Traduit l'adresse (window.location.hash) en page à afficher. */
export function lireRoute(hash: string): Position {
  if (hash.startsWith('#/')) {
    const adresse = hash.replace(/\/+$/, '')
    if (adresse === ROUTE_ADMIN || adresse.startsWith(`${ROUTE_ADMIN}/`)) {
      return { page: 'admin', chemin: adresse.slice(ROUTE_ADMIN.length) || '/' }
    }
    return { page: adresse === ROUTE_DEMANDE ? 'demande' : 'accueil' }
  }
  const ancre = hash.replace(/^#/, '')
  return ancre ? { page: 'accueil', ancre } : { page: 'accueil' }
}
