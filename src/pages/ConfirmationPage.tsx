// État de confirmation : circuit et date demandée, envoi simulé, réservation à confirmer
// (cahier des charges § 9.2). Affiche uniquement la demande validée reçue en props.
import { useEffect, useRef } from 'react'
import Header from '../components/layout/Header'
import ListeRecap from '../components/ui/ListeRecap'
import Alerte from '../components/ui/Alerte'
import { Bouton } from '../components/ui/Bouton'
import { lignesConfirmation } from '../components/demande/lignesConfirmation'
import type { DemandeReservation } from '../domain/types'

interface ConfirmationPageProps {
  demande: DemandeReservation
  onRetour: () => void
}

export default function ConfirmationPage({ demande, onRetour }: ConfirmationPageProps) {
  const refTitre = useRef<HTMLHeadingElement>(null)

  // Annonce du nouvel écran aux lecteurs d'écran, sans provoquer de défilement.
  useEffect(() => {
    refTitre.current?.focus({ preventScroll: true })
  }, [])

  return (
    <>
      <Header onLogo={onRetour} />
      <main id="contenu" tabIndex={-1}>
        <section className="section confirmation" aria-labelledby="confirmation-titre">
          <div className="conteneur conteneur-etroit">
            <p className="statut-pastille">Demande simulée — réservation à confirmer</p>
            <h1 id="confirmation-titre" ref={refTitre} tabIndex={-1}>
              Merci {demande.voyageur.prenom}, votre demande a bien été simulée
            </h1>

            <Alerte type="info">
              <p>
                <strong>Ceci est un envoi simulé :</strong> aucune demande n'a été transmise et aucune
                réservation n'est enregistrée. La réservation reste à confirmer par Vanlife.
              </p>
            </Alerte>

            <div className="carte recap">
              <h2 className="h3">Récapitulatif de votre demande</h2>
              <ListeRecap lignes={lignesConfirmation(demande)} />
            </div>

            <h2 className="h3 suite-titre">Et ensuite ?</h2>
            <p>
              Dans la version définitive, Vanlife vérifiera les disponibilités pour cette date puis vous
              recontactera par e-mail. Aucun paiement n'est demandé à ce stade.
            </p>

            <Bouton onClick={onRetour}>Retour au circuit</Bouton>
          </div>
        </section>
      </main>
    </>
  )
}
