// Back-office Vanlife : règles et contrat de l'API d'administration, partagés par le serveur
// (backend/src/services/admin) et l'interface (src/admin). Aucun import React.
import type { DateIso, StatutDemande } from './types'

export type Role = 'ADMIN' | 'GESTIONNAIRE'

export const LIBELLES_ROLE: Record<Role, string> = {
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
}

export const STATUTS: StatutDemande[] = ['RECUE', 'EN_ETUDE', 'CONFIRMEE', 'REFUSEE', 'ANNULEE']

export const LIBELLES_STATUT: Record<StatutDemande, string> = {
  RECUE: 'Reçue',
  EN_ETUDE: 'En étude',
  CONFIRMEE: 'Confirmée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
}

/**
 * Changements de statut autorisés. Une demande refusée ou annulée est définitivement close :
 * sa place a pu être reprise par quelqu'un d'autre (le client refait une demande si besoin).
 */
export const TRANSITIONS: Record<StatutDemande, StatutDemande[]> = {
  RECUE: ['EN_ETUDE', 'CONFIRMEE', 'REFUSEE', 'ANNULEE'],
  EN_ETUDE: ['CONFIRMEE', 'REFUSEE', 'ANNULEE'],
  CONFIRMEE: ['ANNULEE'],
  REFUSEE: [],
  ANNULEE: [],
}

export const transitionPermise = (de: StatutDemande, vers: StatutDemande) => TRANSITIONS[de].includes(vers)

export const MOT_DE_PASSE_LONGUEUR_MIN = 12
export const COMMENTAIRE_LONGUEUR_MAX = 1000
export const NOTE_LONGUEUR_MAX = 2000

// ---------- Réponses de l'API d'administration ----------

export interface UtilisateurConnecte {
  id: string
  email: string
  nom: string
  role: Role
}

export interface LigneDemande {
  reference: string
  statut: StatutDemande
  creeLe: string
  dateDepart: DateIso
  sejourNom: string
  client: { prenom: string; nom: string | null; email: string }
}

export interface PageDemandes {
  demandes: LigneDemande[]
  total: number
  page: number
  parPage: number
  /** Nombre de demandes par statut (pour les onglets), indépendamment du filtre de statut. */
  compteurs: Record<StatutDemande, number>
}

export interface FiltresDemandes {
  statut?: StatutDemande
  /** Référence, prénom, nom ou e-mail (contient, sans tenir compte des majuscules). */
  recherche?: string
  page?: number
}

export interface EvenementHistorique {
  ancienStatut: StatutDemande | null
  nouveauStatut: StatutDemande
  le: string
  /** Nom de la personne de Vanlife ; null = le client ou le système. */
  auteur: string | null
  commentaire: string | null
}

export type TypeEmail = 'ACCUSE_RECEPTION' | 'NOTIFICATION_VANLIFE' | 'CHANGEMENT_STATUT'
export type StatutEmail = 'EN_ATTENTE' | 'EN_COURS' | 'ENVOYE' | 'ECHEC'

export const LIBELLES_TYPE_EMAIL: Record<TypeEmail, string> = {
  ACCUSE_RECEPTION: 'Accusé de réception',
  NOTIFICATION_VANLIFE: 'Notification à Vanlife',
  CHANGEMENT_STATUT: 'Changement de statut',
}

export const LIBELLES_STATUT_EMAIL: Record<StatutEmail, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: "En cours d'envoi",
  ENVOYE: 'Envoyé',
  ECHEC: 'Échec',
}

export interface EmailDemande {
  type: TypeEmail
  destinataire: string
  sujet: string
  statut: StatutEmail
  tentatives: number
  creeLe: string
  envoyeLe: string | null
  derniereErreur: string | null
}

export interface DetailDemande {
  reference: string
  statut: StatutDemande
  creeLe: string
  modifieLe: string
  sejour: { id: string; nom: string }
  dateDepart: DateIso
  dateRetour: DateIso
  nombreVoyageurs: number
  prixIndicatif: number
  message: string | null
  noteInterne: string | null
  client: { prenom: string; nom: string | null; email: string; telephone: string | null }
  historique: EvenementHistorique[]
  emails: EmailDemande[]
  transitionsPossibles: StatutDemande[]
}

export interface ChangementStatut {
  statut: StatutDemande
  /** Visible par le client s'il est informé ; conservé dans l'historique. */
  commentaire?: string
  /** Envoyer l'e-mail de changement de statut au client. */
  informerClient: boolean
}

export type StatutDepartAdmin = 'OUVERT' | 'COMPLET' | 'FERME'

export const LIBELLES_STATUT_DEPART: Record<StatutDepartAdmin, string> = {
  OUVERT: 'Ouvert',
  COMPLET: 'Complet (forcé)',
  FERME: 'Fermé',
}

export interface DepartAdmin {
  id: number
  date: DateIso
  capacite: number
  statut: StatutDepartAdmin
  /** Demandes reçues, en étude ou confirmées : elles occupent une place. */
  demandesActives: number
  demandesConfirmees: number
}

export interface ModificationDepart {
  capacite?: number
  statut?: StatutDepartAdmin
}

export interface NouveauDepart {
  sejourId: string
  date: DateIso
  capacite: number
}
