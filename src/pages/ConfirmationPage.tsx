// Confirmation : la demande est enregistrée par le serveur ; la réservation reste à confirmer par Vanlife.
// Affiche uniquement la demande renvoyée par le serveur (props).
import { useEffect, useRef } from 'react'
import Header from '../components/layout/Header'
import ListeRecap from '../components/ui/ListeRecap'
import Alerte from '../components/ui/Alerte'
import { Bouton, LienBouton } from '../components/ui/Bouton'
import { lignesConfirmation } from '../components/demande/lignesConfirmation'
import type { DemandeEnregistree } from '../domain/types'
import { cheminSuivi } from '../domain/suivi'

interface ConfirmationPageProps {
  demande: DemandeEnregistree
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
            <p className="statut-pastille">Demande reçue — réservation à confirmer</p>
            <h1 id="confirmation-titre" ref={refTitre} tabIndex={-1}>
              Merci {demande.voyageur.prenom}, votre demande est enregistrée
            </h1>

            <Alerte type="info">
              <p>
                Votre référence : <strong className="reference">{demande.reference}</strong>.
                Depuis votre espace, vous pouvez suivre votre demande, l'annuler ou écrire à Vanlife.
              </p>
            </Alerte>

            <div className="carte recap">
              <h2 className="h3">Récapitulatif de votre demande</h2>
              <ListeRecap lignes={lignesConfirmation(demande)} />
            </div>

            <h2 className="h3 suite-titre">Et ensuite ?</h2>
            <p>
              Un e-mail récapitulatif vous est envoyé à l'adresse <strong>{demande.voyageur.email}</strong>,
              avec votre lien personnel de suivi.
              Pensez à vérifier vos courriers indésirables si vous ne le voyez pas dans quelques minutes.
            </p>
            <p>
              Ce n'est pas encore une réservation : Vanlife vérifie la disponibilité du van pour cette date,
              puis vous recontacte. Aucun paiement n'est demandé à ce stade.
            </p>

            <div className="actions">
              <LienBouton href={cheminSuivi(demande.reference, demande.jetonSuivi)}>Suivre ma demande</LienBouton>
              <Bouton variante="secondaire" onClick={onRetour}>Retour au circuit</Bouton>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
