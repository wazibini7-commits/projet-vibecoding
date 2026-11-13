// Formats de date du back-office.

/** « 2027-01-10T11:05:00Z » → « 10/01/2027 à 12:05 » (heure locale). */
export function formaterDateHeure(iso: string): string {
  const d = new Date(iso)
  const jour = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${jour} à ${heure}`
}

/** « 2027-05-15 » → « 15/05/2027 » (tableaux). */
export function formaterDateCourte(iso: string): string {
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}
