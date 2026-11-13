// Navigation entre pages par l'adresse après le « # » (aucune bibliothèque, aucun réglage
// d'hébergement nécessaire). Deux sortes d'adresses :
//   « #/demande »  → une PAGE (commence par « #/ ») ;
//   « #programme » → une SECTION de la page d'accueil (ancre classique).

export type Page = 'accueil' | 'demande'

export const ROUTE_ACCUEIL = '#/'
export const ROUTE_DEMANDE = '#/demande'

export interface Position {
  page: Page
  /** Section à afficher (id HTML), le cas échéant. */
  ancre?: string
}

/** Traduit l'adresse (window.location.hash) en page à afficher. */
export function lireRoute(hash: string): Position {
  if (hash.startsWith('#/')) {
    return { page: hash.replace(/\/+$/, '') === ROUTE_DEMANDE ? 'demande' : 'accueil' }
  }
  const ancre = hash.replace(/^#/, '')
  return ancre ? { page: 'accueil', ancre } : { page: 'accueil' }
}
