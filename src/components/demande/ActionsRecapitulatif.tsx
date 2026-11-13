import { Bouton } from '../ui/Bouton'

interface ActionsRecapitulatifProps {
  onModifier: () => void
  onEnvoyer: () => void
  envoiEnCours?: boolean
}

/** Rappel « envoi simulé » + boutons Modifier / Envoyer sous le récapitulatif. */
export default function ActionsRecapitulatif({ onModifier, onEnvoyer, envoiEnCours = false }: ActionsRecapitulatifProps) {
  return (
    <>
      <p className="alerte alerte-info">
        En cliquant sur « Envoyer ma demande », l'envoi est <strong>simulé</strong> : aucune donnée
        n'est transmise et la réservation reste à confirmer.
      </p>
      <div className="actions">
        <Bouton variante="secondaire" onClick={onModifier} disabled={envoiEnCours}>Modifier</Bouton>
        <Bouton onClick={onEnvoyer} disabled={envoiEnCours}>
          {envoiEnCours ? 'Envoi en cours…' : 'Envoyer ma demande (simulation)'}
        </Bouton>
      </div>
    </>
  )
}
