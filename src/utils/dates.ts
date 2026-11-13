// Outils de dates calendaires « AAAA-MM-JJ ». Les calculs se font en UTC
// pour ne jamais être décalés d'un jour par le fuseau horaire ou l'heure d'été.
import type { DateIso } from '../domain/types'

const FORMAT_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** Vrai si la chaîne est une date calendaire réelle (refuse 2027-02-30). */
export function estDateIsoValide(valeur: string): valeur is DateIso {
  const m = FORMAT_ISO.exec(valeur)
  if (!m) return false
  const [, a, mo, j] = m.map(Number)
  const d = new Date(Date.UTC(a, mo - 1, j))
  return d.getUTCFullYear() === a && d.getUTCMonth() === mo - 1 && d.getUTCDate() === j
}

/** Date locale du jour (celle du visiteur) au format ISO. */
export function aujourdhuiIso(maintenant: Date = new Date()): DateIso {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${maintenant.getFullYear()}-${p(maintenant.getMonth() + 1)}-${p(maintenant.getDate())}`
}

export function ajouterJours(date: DateIso, jours: number): DateIso {
  const [a, m, j] = date.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j + jours)).toISOString().slice(0, 10)
}

/** « 2027-05-14 » → « vendredi 14 mai 2027 ». */
export function formaterDateFr(date: DateIso): string {
  const [a, m, j] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(a, m - 1, j)))
}
