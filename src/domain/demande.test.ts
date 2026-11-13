import { describe, expect, it } from 'vitest'
import { creerDemande, genererReferenceDemo } from './demande'
import { MESSAGES } from './validation'
import { MENTION_DEMO, SEJOUR_BRETAGNE_SAUVAGE as SEJOUR } from '../data/sejour'

const options = {
  aujourdhui: '2026-11-12',
  maintenant: new Date('2026-11-12T10:00:00Z'),
  genererReference: () => 'DEMO-TEST01',
}

describe('creerDemande', () => {
  it('saisie complète → demande simulée cohérente avec la saisie', () => {
    const r = creerDemande({ prenom: ' Camille', email: 'camille@exemple.fr', dateDepart: '2027-05-14' }, SEJOUR, options)
    expect(r).toEqual({
      ok: true,
      demande: {
        reference: 'DEMO-TEST01',
        statut: 'simulee-a-confirmer',
        creeeLe: '2026-11-12T10:00:00.000Z',
        sejour: {
          id: 'bretagne-sauvage', nom: 'Bretagne Sauvage', jours: 5, nuits: 4,
          nombreVoyageurs: 2, villeDepart: 'Rennes', villeRetour: 'Rennes', prixIndicatif: 1390,
        },
        voyageur: { prenom: 'Camille', email: 'camille@exemple.fr' },
        dateDepart: '2027-05-14',
        dateRetour: '2027-05-18',
      },
    })
  })

  it('retour calculé à travers un changement de mois et le passage à l’heure d’été', () => {
    const r = creerDemande({ prenom: 'A', email: 'a@b.fr', dateDepart: '2027-03-29' }, SEJOUR, options)
    expect(r.ok && r.demande.dateRetour).toBe('2027-04-02')
  })

  it('demande vide → aucune demande créée, erreurs renvoyées', () => {
    const r = creerDemande({ prenom: '', email: '', dateDepart: '' }, SEJOUR, options)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erreurs.email).toBe(MESSAGES.emailVide)
  })

  it('e-mail mal formé → refus', () => {
    const r = creerDemande({ prenom: 'Camille', email: 'camille@exemple', dateDepart: '2027-05-14' }, SEJOUR, options)
    expect(r).toEqual({ ok: false, erreurs: { email: MESSAGES.emailMalForme } })
  })

  it('référence de démonstration au bon format', () => {
    expect(genererReferenceDemo()).toMatch(/^DEMO-[A-Z0-9]{6}$/)
  })
})

describe('données du séjour (cahier des charges § 7)', () => {
  it('correspondent au brief', () => {
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
