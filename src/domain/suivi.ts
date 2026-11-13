// Espace client : suivi d'une demande par lien personnel, annulation, messages avec Vanlife.
// Contrat partagé par le serveur (backend/src/services/suivi.ts) et l'interface (src/pages/SuiviPage.tsx).
//
// Accès : un lien secret (« lien magique ») envoyé par e-mail. Sans ce lien, le client donne sa référence
// et son e-mail et reçoit un nouveau lien PAR E-MAIL : il faut donc avoir accès à sa boîte de réception.
// Référence + e-mail seuls ne suffisent jamais à consulter ni à annuler une demande.
import type { DateIso, StatutDemande } from './types'

/** Le client peut annuler lui-même tant que Vanlife n'a pas confirmé ; ensuite, il écrit à Vanlife. */
export const STATUTS_ANNULABLES_PAR_CLIENT: StatutDemande[] = ['RECUE', 'EN_ETUDE']

export const MESSAGE_SUIVI_LONGUEUR_MAX = 2000
export const MOTIF_ANNULATION_LONGUEUR_MAX = 500

/** Étapes affichées au client, dans l'ordre (une demande refusée ou annulée s'arrête en chemin). */
export const ETAPES_SUIVI: { statut: StatutDemande; libelle: string; explication: string }[] = [
  { statut: 'RECUE', libelle: 'Demande reçue', explication: 'Vanlife a bien reçu votre demande.' },
  { statut: 'EN_ETUDE', libelle: 'En cours d’étude', explication: 'Vanlife vérifie la disponibilité du van pour votre date.' },
  { statut: 'CONFIRMEE', libelle: 'Séjour confirmé', explication: 'Votre séjour est confirmé. Bon voyage !' },
]

export interface MessageSuivi {
  auteur: 'CLIENT' | 'VANLIFE'
  /** Prénom de la personne de Vanlife qui a répondu (jamais son nom complet ni son e-mail). */
  signature: string | null
  texte: string
  le: string
}

/** Ce que voit le client (jamais la note interne, ni l'e-mail de l'équipe). */
export interface SuiviDemande {
  reference: string
  statut: StatutDemande
  creeLe: string
  sejour: { id: string; nom: string; villeDepart: string; villeRetour: string }
  dateDepart: DateIso
  dateRetour: DateIso
  nombreVoyageurs: number
  prixIndicatif: number
  voyageur: { prenom: string; email: string }
  historique: { statut: StatutDemande; le: string }[]
  messages: MessageSuivi[]
  peutAnnuler: boolean
}

/** Identifie la demande et prouve l'accès (lien personnel). */
export interface AccesSuivi {
  reference: string
  jeton: string
}

/** Message de réponse identique, qu'une demande corresponde ou non (on ne révèle rien). */
export const MESSAGE_LIEN_ENVOYE =
  'Si une demande correspond à cette référence et à cette adresse, un lien de suivi vient de vous être envoyé par e-mail.'

/** Adresse de la page de suivi (partie après le #), avec le lien personnel. */
export const cheminSuivi = (reference: string, jeton: string) =>
  `#/suivi/${encodeURIComponent(reference)}/${encodeURIComponent(jeton)}`
