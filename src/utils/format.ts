/**
 * 1390 → « 1 390 € » (format français).
 * Intl utilise une espace fine insécable (U+202F), quasi invisible à l'écran :
 * on la remplace par une espace insécable classique (U+00A0).
 */
export function formaterPrix(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(montant).replaceAll(ESPACE_FINE, ESPACE_INSECABLE)
}

const ESPACE_FINE = String.fromCharCode(0x202f)
const ESPACE_INSECABLE = String.fromCharCode(0x00a0)

/** ['Partenaires', 'Tarifs', 'Nuitées'] → « partenaires, tarifs et nuitées » */
export function formaterListe(elements: string[]): string {
  const bas = elements.map((e) => e.toLocaleLowerCase('fr-FR'))
  return bas.length <= 1 ? bas.join('') : `${bas.slice(0, -1).join(', ')} et ${bas[bas.length - 1]}`
}

/** 5 jours / 4 nuits */
export function formaterDuree(jours: number, nuits: number): string {
  return `${jours} jour${jours > 1 ? 's' : ''} / ${nuits} nuit${nuits > 1 ? 's' : ''}`
}
