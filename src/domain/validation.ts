// Règles de validation du formulaire de demande (cahier des charges § 5 et 9.2).
// Fonctions pures : elles reçoivent la saisie brute et ne touchent jamais à l'interface.
import type { ChampDemande, DemandeSaisie, ErreursDemande, ResultatValidation } from './types'
import { aujourdhuiIso, estDateIsoValide } from '../utils/dates'

export const PRENOM_LONGUEUR_MAX = 50

/** Format volontairement simple : texte@domaine.extension, sans espace. */
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const MESSAGES = {
  prenomVide: 'Veuillez indiquer votre prénom.',
  prenomTropLong: `Le prénom ne doit pas dépasser ${PRENOM_LONGUEUR_MAX} caractères.`,
  emailVide: 'Veuillez indiquer votre adresse e-mail.',
  emailMalForme: "L'adresse e-mail n'est pas valide (exemple : prenom@exemple.fr).",
  dateVide: 'Veuillez choisir une date de départ souhaitée.',
  dateInvalide: "La date de départ n'est pas valide.",
  dateIncomplete: 'La date de départ est incomplète : renseignez le jour, le mois et l’année.',
  datePassee: "La date de départ doit être postérieure à aujourd'hui.",
} as const

export function validerPrenom(valeur: string): string | undefined {
  const v = valeur.trim()
  if (!v) return MESSAGES.prenomVide
  if (v.length > PRENOM_LONGUEUR_MAX) return MESSAGES.prenomTropLong
  return undefined
}

export function validerEmail(valeur: string): string | undefined {
  const v = valeur.trim()
  if (!v) return MESSAGES.emailVide
  if (!FORMAT_EMAIL.test(v)) return MESSAGES.emailMalForme
  return undefined
}

/** @param aujourdhui date du jour (injectable pour les tests). */
export function validerDateDepart(valeur: string, aujourdhui: string = aujourdhuiIso()): string | undefined {
  const v = valeur.trim()
  if (!v) return MESSAGES.dateVide
  if (!estDateIsoValide(v)) return MESSAGES.dateInvalide
  if (v <= aujourdhui) return MESSAGES.datePassee // comparaison lexicale valable au format ISO
  return undefined
}

/** Valide un seul champ (utile pour un contrôle au fil de la saisie). */
export function validerChamp(champ: ChampDemande, saisie: DemandeSaisie, aujourdhui?: string): string | undefined {
  switch (champ) {
    case 'prenom': return validerPrenom(saisie.prenom)
    case 'email': return validerEmail(saisie.email)
    case 'dateDepart': return validerDateDepart(saisie.dateDepart, aujourdhui)
  }
}

/**
 * Valide l'ensemble de la saisie.
 * - Invalide → toutes les erreurs, une par champ.
 * - Valide → des données NETTOYÉES (espaces retirés), distinctes de la saisie brute.
 */
export function validerDemande(saisie: DemandeSaisie, aujourdhui: string = aujourdhuiIso()): ResultatValidation {
  const erreurs: ErreursDemande = {}
  const champs: ChampDemande[] = ['prenom', 'email', 'dateDepart']
  for (const champ of champs) {
    const message = validerChamp(champ, saisie, aujourdhui)
    if (message) erreurs[champ] = message
  }
  if (Object.keys(erreurs).length > 0) return { valide: false, erreurs }

  return {
    valide: true,
    donnees: {
      prenom: saisie.prenom.trim(),
      email: saisie.email.trim(),
      dateDepart: saisie.dateDepart.trim(),
    },
  }
}

export const SAISIE_VIDE: DemandeSaisie = { prenom: '', email: '', dateDepart: '' }
