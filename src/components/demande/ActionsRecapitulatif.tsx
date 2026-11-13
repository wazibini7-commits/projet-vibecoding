import { Bouton } from '../ui/Bouton'

interface ActionsRecapitulatifProps {
  onModifier: () => void
  onEnvoyer: () => void
  envoiEnCours?: boolean
}

/** Rappel « sans engagement » + boutons Modifier / Envoyer sous le récapitulatif. */
export default function ActionsRecapitulatif({ onModifier, onEnvoyer, envoiEnCours = false }: ActionsRecapitulatifProps) {
  return (
    <>
      <p className="alerte alerte-info">
        En cliquant sur « Envoyer ma demande », votre demande est <strong>transmise à Vanlife</strong>.
        Ce n'est pas encore une réservation : elle reste à confirmer.
      </p>
      <div className="actions">
        <Bouton variante="secondaire" onClick={onModifier} disabled={envoiEnCours}>Modifier</Bouton>
        <Bouton onClick={onEnvoyer} disabled={envoiEnCours} aria-busy={envoiEnCours || undefined}>
          {envoiEnCours ? 'Envoi en cours…' : 'Envoyer ma demande'}
        </Bouton>
      </div>
    </>
  )
}
