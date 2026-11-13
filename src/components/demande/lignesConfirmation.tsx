import type { DemandeReservation } from '../../domain/types'
import { formaterDateFr } from '../../utils/dates'
import { formaterDuree, formaterPrix } from '../../utils/format'
import type { LigneRecap } from '../ui/ListeRecap'
import Badge from '../ui/Badge'

/** Lignes de l'écran de confirmation, construites UNIQUEMENT à partir de la demande transmise. */
export function lignesConfirmation(demande: DemandeReservation): LigneRecap[] {
  const { sejour, voyageur } = demande
  return [
    { libelle: 'Circuit', valeur: `${sejour.nom} — ${formaterDuree(sejour.jours, sejour.nuits)}` },
    { libelle: 'Voyageurs', valeur: `${sejour.nombreVoyageurs} personnes` },
    { libelle: 'Date de départ demandée', valeur: `${formaterDateFr(demande.dateDepart)} — ${sejour.villeDepart}` },
    { libelle: 'Retour prévu', valeur: `${formaterDateFr(demande.dateRetour)} — ${sejour.villeRetour}` },
    {
      libelle: 'Prix indicatif',
      valeur: <>{formaterPrix(sejour.prixIndicatif)} pour {sejour.nombreVoyageurs} <Badge>à confirmer</Badge></>,
    },
    { libelle: 'Contact', valeur: `${voyageur.prenom} — ${voyageur.email}`, cesure: true },
    { libelle: 'Référence de test', valeur: demande.reference },
  ]
}
