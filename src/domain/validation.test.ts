// Étape 4 — Tests de la logique métier de validation (Vitest).
// La date du jour est injectée (AUJ) pour que les tests ne dépendent pas de la date réelle.
import { describe, expect, it } from 'vitest'
import {
  MESSAGES, PRENOM_LONGUEUR_MAX, SAISIE_VIDE,
  validerChamp, validerDateDepart, validerDemande, validerEmail, validerPrenom,
} from './validation'
import type { DemandeSaisie } from './types'

const AUJ = '2026-11-12'
const VALIDE: DemandeSaisie = { prenom: 'Camille', email: 'camille@exemple.fr', dateDepart: '2027-05-14' }

describe('1. Champs vides', () => {
  it('demande entièrement vide : une erreur explicite par champ', () => {
    expect(validerDemande(SAISIE_VIDE, AUJ)).toEqual({
      valide: false,
      erreurs: { prenom: MESSAGES.prenomVide, email: MESSAGES.emailVide, dateDepart: MESSAGES.dateVide },
    })
  })

  it('champs remplis uniquement d’espaces : considérés comme vides', () => {
    expect(validerDemande({ prenom: '   ', email: '  ', dateDepart: ' ' }, AUJ)).toEqual({
      valide: false,
      erreurs: { prenom: MESSAGES.prenomVide, email: MESSAGES.emailVide, dateDepart: MESSAGES.dateVide },
    })
  })

  it('prénom seul manquant : seul le prénom est signalé', () => {
    expect(validerDemande({ ...VALIDE, prenom: '' }, AUJ)).toEqual({ valide: false, erreurs: { prenom: MESSAGES.prenomVide } })
  })

  it('e-mail seul manquant : seul l’e-mail est signalé', () => {
    expect(validerDemande({ ...VALIDE, email: '' }, AUJ)).toEqual({ valide: false, erreurs: { email: MESSAGES.emailVide } })
  })

  it('prénom trop long : refusé avec un message explicite', () => {
    expect(validerPrenom('A'.repeat(PRENOM_LONGUEUR_MAX + 1))).toBe(MESSAGES.prenomTropLong)
    expect(validerPrenom('A'.repeat(PRENOM_LONGUEUR_MAX))).toBeUndefined()
  })
})

describe('2. Adresses e-mail incorrectes', () => {
  it.each([
    ['sans @', 'camille.exemple.fr'],
    ['sans domaine', 'camille@'],
    ['sans extension', 'camille@exemple'],
    ['extension d’une lettre', 'camille@exemple.f'],
    ['sans partie locale', '@exemple.fr'],
    ['espace interne', 'ca mille@exemple.fr'],
    ['deux @', 'camille@@exemple.fr'],
    ['texte libre', 'mon adresse'],
  ])('%s (%s) : refusée', (_cas, email) => {
    expect(validerDemande({ ...VALIDE, email }, AUJ)).toEqual({ valide: false, erreurs: { email: MESSAGES.emailMalForme } })
  })

  it.each(['camille@exemple.fr', 'c.dupont+vanlife@mail.exemple.com', '  camille@exemple.fr  '])(
    'adresse correcte acceptée : %s',
    (email) => expect(validerEmail(email)).toBeUndefined(),
  )
})

describe('3. Dates manquantes ou invalides', () => {
  it('date seule manquante : seule la date est signalée', () => {
    expect(validerDemande({ ...VALIDE, dateDepart: '' }, AUJ)).toEqual({ valide: false, erreurs: { dateDepart: MESSAGES.dateVide } })
  })

  it.each([
    ['format français', '14/05/2027'],
    ['jour inexistant', '2027-02-30'],
    ['29 février non bissextile', '2027-02-29'],
    ['texte', 'demain'],
  ])('%s (%s) : refusée comme invalide', (_cas, dateDepart) => {
    expect(validerDateDepart(dateDepart, AUJ)).toBe(MESSAGES.dateInvalide)
  })
})

describe('4. Dates passées (règle retenue : départ au plus tôt le lendemain)', () => {
  it.each([
    ['date ancienne', '2020-01-01'],
    ['hier', '2026-11-11'],
    ['aujourd’hui', AUJ],
  ])('%s : refusée', (_cas, dateDepart) => {
    expect(validerDemande({ ...VALIDE, dateDepart }, AUJ)).toEqual({ valide: false, erreurs: { dateDepart: MESSAGES.datePassee } })
  })

  it('demain : acceptée (limite basse)', () => {
    expect(validerDateDepart('2026-11-13', AUJ)).toBeUndefined()
  })

  it('changement d’année : comparaison correcte', () => {
    expect(validerDateDepart('2027-01-01', '2026-12-31')).toBeUndefined()
    expect(validerDateDepart('2026-12-31', '2027-01-01')).toBe(MESSAGES.datePassee)
  })
})

describe('5. Demande valide', () => {
  it('saisie complète : acceptée, sans erreur', () => {
    expect(validerDemande(VALIDE, AUJ)).toEqual({ valide: true, donnees: VALIDE })
  })

  it('données validées nettoyées et distinctes de la saisie brute (non modifiée)', () => {
    const saisie = { prenom: '  Camille ', email: ' camille@exemple.fr ', dateDepart: ' 2027-05-14 ' }
    const copie = { ...saisie }
    expect(validerDemande(saisie, AUJ)).toEqual({ valide: true, donnees: VALIDE })
    expect(saisie).toEqual(copie)
  })

  it('accents et prénoms composés acceptés', () => {
    expect(validerPrenom('Jean-Loïc')).toBeUndefined()
    expect(validerPrenom('Anne Sophie')).toBeUndefined()
  })
})

describe('validerChamp (contrôle champ par champ)', () => {
  it('ne contrôle que le champ demandé', () => {
    expect(validerChamp('prenom', { ...SAISIE_VIDE, prenom: 'Camille' }, AUJ)).toBeUndefined()
    expect(validerChamp('email', SAISIE_VIDE, AUJ)).toBe(MESSAGES.emailVide)
    expect(validerChamp('dateDepart', { ...SAISIE_VIDE, dateDepart: '2020-01-01' }, AUJ)).toBe(MESSAGES.datePassee)
  })
})
