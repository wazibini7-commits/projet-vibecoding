/** Le visiteur a-t-il demandé à réduire les animations (réglage système) ? */
export function animationsReduites(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Le visiteur a-t-il activé l'économiseur de données (mobile) ? */
export function economieDeDonnees(): boolean {
  const connexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(connexion?.saveData)
}
