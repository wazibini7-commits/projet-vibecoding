import { ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '../../api/client'
import { Bouton } from './Bouton'

/** Zone affichée pendant le chargement de données du serveur (annoncée aux lecteurs d'écran). */
export function ChargementDonnees({ texte }: { texte: string }) {
  return (
    <div className="etat-donnees" role="status" aria-live="polite">
      <span className="indicateur-chargement" aria-hidden="true" />
      <p>{texte}</p>
    </div>
  )
}

interface ErreurDonneesProps {
  titre: string
  erreur: unknown
  onReessayer: () => void
  /** Vrai pendant le nouvel essai. */
  enCours?: boolean
}

/** Données indisponibles : message clair et bouton « Réessayer ». */
export function ErreurDonnees({ titre, erreur, onReessayer, enCours = false }: ErreurDonneesProps) {
  const message = erreur instanceof ErreurApi ? erreur.message : MESSAGE_SERVEUR_INJOIGNABLE
  return (
    <div className="etat-donnees">
      <div className="alerte alerte-erreur" role="alert">
        <p><strong>{titre}</strong></p>
        <p>{message}</p>
      </div>
      <Bouton variante="secondaire" onClick={onReessayer} disabled={enCours}>
        {enCours ? 'Nouvel essai…' : 'Réessayer'}
      </Bouton>
    </div>
  )
}
