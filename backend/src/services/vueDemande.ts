// Conversion d'une demande de la base vers le format partagé `DemandeReservation`
// (e-mails, réponses de l'API), utilisée par plusieurs services.
import type { Prisma } from '@prisma/client'
import type { DemandeReservation } from '../../../src/domain/types'
import { versIso } from '../dates'

export const AVEC_CLIENT_ET_SEJOUR = {
  client: true,
  depart: { include: { sejour: true } },
} satisfies Prisma.DemandeInclude

export type DemandeAvecClientEtSejour = Prisma.DemandeGetPayload<{ include: typeof AVEC_CLIENT_ET_SEJOUR }>

export function versDemandeReservation(d: DemandeAvecClientEtSejour): DemandeReservation {
  const s = d.depart.sejour
  return {
    reference: d.reference,
    statut: d.statut,
    creeeLe: d.creeLe.toISOString(),
    sejour: {
      id: s.id, nom: s.nom, jours: s.dureeJours, nuits: s.dureeNuits,
      nombreVoyageurs: d.nombreVoyageurs, villeDepart: s.villeDepart, villeRetour: s.villeRetour,
      prixIndicatif: d.prixCentimes / 100,
    },
    voyageur: { prenom: d.client.prenom, email: d.client.email },
    dateDepart: versIso(d.depart.date),
    dateRetour: versIso(d.dateRetour),
  }
}

/** Prénom seul d'un membre de l'équipe (signature des messages : jamais le nom complet). */
export const prenomEquipier = (nom: string | null | undefined) => nom?.trim().split(/\s+/)[0] || "L'équipe"
