import type { DemandeValidee, Sejour } from '../../domain/types'
import { ajouterJours, formaterDateFr } from '../../utils/dates'
import { formaterDuree, formaterPrix } from '../../utils/format'
import type { LigneRecap } from '../ui/ListeRecap'
import Badge from '../ui/Badge'

/** Lignes du récapitulatif : circuit, voyageurs, dates aller/retour, prix, coordonnées. */
export function lignesRecapitulatif(sejour: Sejour, donnees: DemandeValidee): LigneRecap[] {
  const retour = ajouterJours(donnees.dateDepart, sejour.duree.jours - 1)
  return [
    { libelle: 'Circuit', valeur: `${sejour.nom} — ${formaterDuree(sejour.duree.jours, sejour.duree.nuits)}` },
    { libelle: 'Voyageurs', valeur: `${sejour.nombreVoyageurs} personnes` },
    { libelle: 'Départ', valeur: `${formaterDateFr(donnees.dateDepart)} — ${sejour.villeDepart}` },
    { libelle: 'Retour', valeur: `${formaterDateFr(retour)} — ${sejour.villeRetour}` },
    {
      libelle: 'Prix indicatif',
      valeur: <>{formaterPrix(sejour.prix.montant)} pour {sejour.prix.pourPersonnes} <Badge>à confirmer</Badge></>,
    },
    { libelle: 'Prénom', valeur: donnees.prenom },
    { libelle: 'E-mail', valeur: donnees.email, cesure: true },
  ]
}
