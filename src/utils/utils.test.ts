import { describe, expect, it } from 'vitest'
import { ajouterJours, aujourdhuiIso, estDateIsoValide, formaterDateFr } from './dates'
import { formaterDuree, formaterDureeRoute, formaterListe, formaterPrix } from './format'

describe('dates', () => {
  it('estDateIsoValide', () => {
    expect(estDateIsoValide('2027-05-14')).toBe(true)
    expect(estDateIsoValide('2028-02-29')).toBe(true)
    expect(estDateIsoValide('2027-02-29')).toBe(false)
    expect(estDateIsoValide('2027-5-14')).toBe(false)
  })
  it('ajouterJours change de mois et d’année', () => {
    expect(ajouterJours('2026-12-30', 4)).toBe('2027-01-03')
  })
  it('aujourdhuiIso utilise la date locale', () => {
    expect(aujourdhuiIso(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12')
  })
  it('formaterDateFr', () => {
    expect(formaterDateFr('2027-05-14')).toBe('vendredi 14 mai 2027')
    expect(formaterDateFr('2027-05-01')).toBe('samedi 1er mai 2027') // « 1er », jamais « 1 »
    expect(formaterDateFr('2027-05-01', { annee: false })).toBe('samedi 1er mai')
  })
})

describe('format', () => {
  it('formaterPrix : espace insécable visible (U+00A0), pas d’espace fine', () => {
    expect(formaterPrix(1390)).toBe('1 390 €')
  })
  it('formaterListe', () => {
    expect(formaterListe(['Partenaires', 'Tarifs', 'Nuitées'])).toBe('partenaires, tarifs et nuitées')
    expect(formaterListe(['Tarifs'])).toBe('tarifs')
  })
  it('formaterDureeRoute', () => {
    expect(formaterDureeRoute(170)).toBe('2 h 50')
    expect(formaterDureeRoute(95)).toBe('1 h 35')
    expect(formaterDureeRoute(120)).toBe('2 h')
    expect(formaterDureeRoute(30)).toBe('30 min')
    expect(formaterDureeRoute(65)).toBe('1 h 05')
  })
  it('formaterDuree', () => {
    expect(formaterDuree(5, 4)).toBe('5 jours / 4 nuits')
  })
})
