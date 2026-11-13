// Création d'une demande de réservation SIMULÉE : rien n'est stocké ni envoyé
// (stockage et envoi d'e-mails hors périmètre, cahier des charges § 9.4).
import type { DemandeReservation, DemandeSaisie, DemandeValidee, ResultatCreationDemande, Sejour } from './types'
import { validerDemande } from './validation'
import { ajouterJours, aujourdhuiIso } from '../utils/dates'

export interface OptionsCreation {
  /** Date du jour « AAAA-MM-JJ » — injectable pour les tests. */
  aujourdhui?: string
  /** Horloge — injectable pour les tests. */
  maintenant?: Date
  /** Générateur de référence — injectable pour les tests. */
  genererReference?: () => string
}

/** Référence fictive, clairement marquée comme démonstration. */
export function genererReferenceDemo(): string {
  const alea = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')
  return `DEMO-${alea}`
}

/** Construit la demande à partir de données DÉJÀ validées. */
export function construireDemande(
  donnees: DemandeValidee,
  sejour: Sejour,
  options: Pick<OptionsCreation, 'maintenant' | 'genererReference'> = {},
): DemandeReservation {
  const maintenant = options.maintenant ?? new Date()
  const genererReference = options.genererReference ?? genererReferenceDemo
  return {
    reference: genererReference(),
    statut: 'simulee-a-confirmer',
    creeeLe: maintenant.toISOString(),
    sejour: {
      id: sejour.id,
      nom: sejour.nom,
      jours: sejour.duree.jours,
      nuits: sejour.duree.nuits,
      nombreVoyageurs: sejour.nombreVoyageurs,
      villeDepart: sejour.villeDepart,
      villeRetour: sejour.villeRetour,
      prixIndicatif: sejour.prix.montant,
    },
    voyageur: { prenom: donnees.prenom, email: donnees.email },
    dateDepart: donnees.dateDepart,
    // J1 = jour du départ : 5 jours → retour à J+4.
    dateRetour: ajouterJours(donnees.dateDepart, sejour.duree.jours - 1),
  }
}

/** Point d'entrée : saisie brute → demande simulée, ou erreurs explicites. */
export function creerDemande(
  saisie: DemandeSaisie,
  sejour: Sejour,
  options: OptionsCreation = {},
): ResultatCreationDemande {
  const aujourdhui = options.aujourdhui ?? aujourdhuiIso(options.maintenant)
  const resultat = validerDemande(saisie, aujourdhui)
  if (!resultat.valide) return { ok: false, erreurs: resultat.erreurs }
  return { ok: true, demande: construireDemande(resultat.donnees, sejour, options) }
}
