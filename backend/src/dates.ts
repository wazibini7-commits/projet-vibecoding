// Conversions entre les dates calendaires « AAAA-MM-JJ » (API, frontend)
// et les objets Date renvoyés par PostgreSQL pour les colonnes de type DATE (minuit UTC).
import type { DateIso } from '../../src/domain/types'

export const versDate = (iso: DateIso): Date => new Date(`${iso}T00:00:00Z`)

export const versIso = (date: Date): DateIso => date.toISOString().slice(0, 10)
