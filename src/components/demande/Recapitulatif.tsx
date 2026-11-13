import { forwardRef, type ReactNode } from 'react'
import type { DemandeValidee, Sejour } from '../../domain/types'
import ListeRecap, { type LigneRecap } from '../ui/ListeRecap'
import { lignesRecapitulatif } from './lignesRecapitulatif'

interface RecapitulatifProps {
  sejour: Sejour
  /** Données DÉJÀ validées par le domaine. */
  donnees: DemandeValidee
  titre?: string
  /** Lignes supplémentaires (ex. référence de test sur l'écran de confirmation). */
  lignesEnPlus?: LigneRecap[]
  /** Zone libre sous la liste : avertissement, boutons… */
  children?: ReactNode
}

/**
 * Récapitulatif de la demande : circuit et date demandée.
 * La ref pointe sur le titre (focalisable) pour y amener le visiteur.
 */
const Recapitulatif = forwardRef<HTMLHeadingElement, RecapitulatifProps>(function Recapitulatif(
  { sejour, donnees, titre = 'Vérifiez votre demande', lignesEnPlus = [], children },
  ref,
) {
  return (
    <div className="carte recap">
      <h3 ref={ref} tabIndex={-1}>{titre}</h3>
      <ListeRecap lignes={[...lignesRecapitulatif(sejour, donnees), ...lignesEnPlus]} />
      {children}
    </div>
  )
})

export default Recapitulatif
