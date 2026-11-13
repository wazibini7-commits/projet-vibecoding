import type { DepartDisponible } from '../../domain/types'
import { formaterDateFr } from '../../utils/dates'
import type { GroupeOptions } from '../ui/ChampListe'

/** Une « place » = un van pour le groupe de voyageurs. Libellé court : il doit tenir sur smartphone. */
export function libellePlaces(depart: DepartDisponible): string {
  if (depart.complet) return 'complet'
  if (depart.placesRestantes === 1) return 'dernier van'
  return `${depart.placesRestantes} vans libres`
}


/** « 2027-04 » → « Avril 2027 ». */
function libelleMois(date: string): string {
  const [a, m] = date.split('-').map(Number)
  const mois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(a, m - 1, 1)))
  return mois.charAt(0).toUpperCase() + mois.slice(1)
}

/** Départs regroupés par mois, dans l'ordre ; les départs complets restent visibles mais non sélectionnables. */
export function groupesDeparts(departs: DepartDisponible[]): GroupeOptions[] {
  const groupes: GroupeOptions[] = []
  for (const d of [...departs].sort((x, y) => x.date.localeCompare(y.date))) {
    const libelle = libelleMois(d.date)
    let groupe = groupes.at(-1)
    if (groupe?.libelle !== libelle) groupes.push((groupe = { libelle, options: [] }))
    groupe.options.push({
      valeur: d.date,
      libelle: `${formaterDateFr(d.date, { annee: false })} · ${libellePlaces(d)}`,
      desactivee: d.complet,
    })
  }
  return groupes
}
