// Modèle de données du prototype Vanlife — indépendant de l'interface (aucun import React).

/** Date calendaire au format ISO « AAAA-MM-JJ » (sans heure ni fuseau). */
export type DateIso = string

// ---------- Séjour ----------

export interface JourProgramme {
  jour: number
  titre: string
  description: string
}

export interface PrixIndicatif {
  /** Montant en euros pour l'ensemble des voyageurs. */
  montant: number
  devise: 'EUR'
  /** Nombre de personnes couvertes par le montant. */
  pourPersonnes: number
  /** Toujours vrai pour le prototype : le prix doit être validé par Vanlife. */
  aConfirmer: true
}

export interface Sejour {
  id: string
  nom: string
  accroche: string
  destination: string
  duree: { jours: number; nuits: number }
  public: string
  nombreVoyageurs: number
  villeDepart: string
  villeRetour: string
  programme: JourProgramme[]
  prix: PrixIndicatif
  /** Prestations envisagées, comprises dans le prix indicatif. */
  prestationsIncluses: string[]
  /** Dépenses restant à la charge du client. */
  depensesAPrevoir: string[]
  /** Points de l'offre restant à confirmer par Vanlife. */
  elementsAConfirmer: string[]
}

// ---------- Demande de réservation ----------

/** Données brutes saisies dans le formulaire (non fiables, toujours des chaînes). */
export interface DemandeSaisie {
  prenom: string
  email: string
  dateDepart: string
}

export type ChampDemande = keyof DemandeSaisie

/** Un message explicite par champ en erreur. */
export type ErreursDemande = Partial<Record<ChampDemande, string>>

/** Données après validation : nettoyées et garanties conformes. */
export interface DemandeValidee {
  prenom: string
  email: string
  dateDepart: DateIso
}

export type ResultatValidation =
  | { valide: true; donnees: DemandeValidee }
  | { valide: false; erreurs: ErreursDemande }

// ---------- Contrat de l'API (partagé avec le backend : backend/src/services) ----------

/** Étapes de traitement d'une demande par Vanlife. */
export type StatutDemande = 'RECUE' | 'EN_ETUDE' | 'CONFIRMEE' | 'REFUSEE' | 'ANNULEE'

/** Corps de POST /api/demandes. */
export interface EntreeDemande extends DemandeSaisie {
  sejourId: string
  message?: string
}

/** Un départ proposé (GET /api/sejours/:id/departs). */
export interface DepartDisponible {
  date: DateIso
  dateRetour: DateIso
  placesRestantes: number
  complet: boolean
}

/** Résumé d'un séjour (GET /api/sejours). */
export interface ResumeSejour {
  id: string
  nom: string
  accroche: string
  destination: string
  duree: { jours: number; nuits: number }
  prixIndicatif: number
}

/** Suivi d'une demande par le client (POST /api/demandes/suivi). */
export interface SuiviDemande {
  reference: string
  statut: StatutDemande
  sejour: { id: string; nom: string }
  dateDepart: DateIso
  dateRetour: DateIso
  creeeLe: string
  historique: { statut: StatutDemande; le: string }[]
}

/** Demande enregistrée par le serveur (réponse 201 de POST /api/demandes). */
export interface DemandeReservation {
  /** Référence communiquée au client, ex. VL-2027-0042. */
  reference: string
  statut: StatutDemande
  creeeLe: string
  sejour: {
    id: string
    nom: string
    jours: number
    nuits: number
    nombreVoyageurs: number
    villeDepart: string
    villeRetour: string
    prixIndicatif: number
  }
  voyageur: { prenom: string; email: string }
  dateDepart: DateIso
  dateRetour: DateIso
}

/** Erreurs renvoyées par le serveur : celles du formulaire, plus le message libre. */
export type ErreursServeur = ErreursDemande & { message?: string }
