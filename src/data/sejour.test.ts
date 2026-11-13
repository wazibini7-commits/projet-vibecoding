// Contenu du séjour pilote. Ce fichier est aussi la source du remplissage de la base (backend/prisma/seed.ts).
import { describe, expect, it } from 'vitest'
import { ID_SEJOUR_PILOTE, MENTION_DEMO, SEJOUR_BRETAGNE_SAUVAGE as SEJOUR } from './sejour'

describe('données du séjour (cahier des charges § 7)', () => {
  it('correspondent au brief', () => {
    expect(SEJOUR.id).toBe(ID_SEJOUR_PILOTE)
    expect(SEJOUR.nom).toBe('Bretagne Sauvage')
    expect(SEJOUR.duree).toEqual({ jours: 5, nuits: 4 })
    expect(SEJOUR.nombreVoyageurs).toBe(2)
    expect([SEJOUR.villeDepart, SEJOUR.villeRetour]).toEqual(['Rennes', 'Rennes'])
    expect(SEJOUR.programme.map((j) => j.jour)).toEqual([1, 2, 3, 4, 5])
    expect(SEJOUR.programme).toHaveLength(SEJOUR.duree.jours)
    expect(SEJOUR.prix.montant).toBe(1390)
    expect(SEJOUR.prestationsIncluses).toHaveLength(4)
    expect(SEJOUR.depensesAPrevoir).toEqual(['Carburant', 'Repas', 'Autres visites'])
  })

  it('mention de démonstration exacte', () => {
    expect(MENTION_DEMO).toBe('Version de démonstration — offre et disponibilités à confirmer')
  })
})
