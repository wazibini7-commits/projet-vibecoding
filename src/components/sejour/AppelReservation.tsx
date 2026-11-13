import type { Sejour } from '../../domain/types'
import { PHOTOS_PROGRAMME } from '../../data/medias'
import { formaterPrix } from '../../utils/format'
import { ROUTE_DEMANDE } from '../../utils/navigation'
import { LienBouton } from '../ui/Bouton'
import Photo from '../ui/Photo'

/** Fin de l'accueil : invitation à ouvrir la page « Demande de réservation ». */
export default function AppelReservation({ sejour }: { sejour: Sejour }) {
  const fond = PHOTOS_PROGRAMME[4] // pointe Saint-Mathieu au lever du jour
  return (
    <section id="reserver" className="section-appel" aria-labelledby="reserver-titre">
      <div className="section-appel-fond" aria-hidden="true">
        {fond && <Photo media={fond} decorative sizes="100vw" />}
      </div>
      <div className="conteneur section-appel-contenu">
        <p className="surtitre">{sejour.nom} · {formaterPrix(sejour.prix.montant)} pour {sejour.prix.pourPersonnes} (indicatif)</p>
        <h2 id="reserver-titre">Envie de prendre la route ?</h2>
        <p className="accroche">
          Formulez votre demande en une minute : prénom, e-mail et date de départ souhaitée.
          Vanlife reviendra vers vous pour confirmer les disponibilités.
        </p>
        <LienBouton href={ROUTE_DEMANDE}>Faire une demande de réservation</LienBouton>
        <p className="section-appel-note">Envoi simulé — aucune réservation n'est enregistrée.</p>
      </div>
    </section>
  )
}
