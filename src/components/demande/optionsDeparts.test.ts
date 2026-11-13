import { describe, expect, it } from 'vitest'
import { groupesDeparts, libellePlaces } from './optionsDeparts'

const depart = (date: string, placesRestantes: number) =>
  ({ date, dateRetour: date, placesRestantes, complet: placesRestantes === 0 })

describe('liste des départs', () => {
  it('regroupe par mois, dans l’ordre chronologique', () => {
    const groupes = groupesDeparts([depart('2027-05-01', 2), depart('2027-04-03', 2), depart('2027-04-10', 1)])
    expect(groupes.map((g) => g.libelle)).toEqual(['Avril 2027', 'Mai 2027'])
    expect(groupes[0].options.map((o) => o.valeur)).toEqual(['2027-04-03', '2027-04-10'])
  })

  it('indique les places restantes en clair', () => {
    expect(libellePlaces(depart('2027-04-03', 2))).toBe('2 vans libres')
    expect(libellePlaces(depart('2027-04-03', 1))).toBe('dernier van')
    expect(libellePlaces(depart('2027-04-03', 0))).toBe('complet')
  })

  it('un départ complet reste affiché mais ne peut pas être choisi', () => {
    const [groupe] = groupesDeparts([depart('2027-04-03', 0)])
    expect(groupe.options[0]).toEqual({ valeur: '2027-04-03', libelle: 'samedi 3 avril · complet', desactivee: true })
  })

  it('aucune date → aucun groupe', () => {
    expect(groupesDeparts([])).toEqual([])
  })
})
