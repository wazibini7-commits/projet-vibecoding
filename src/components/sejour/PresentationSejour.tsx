import { ROUTE_DEMANDE } from '../../utils/navigation'
import type { Sejour } from '../../domain/types'
import { PHOTO_SEJOUR } from '../../data/medias'
import { MARQUE } from '../../data/marque'
import { formaterDuree, formaterPrix } from '../../utils/format'
import { LienBouton } from '../ui/Bouton'
import Badge from '../ui/Badge'
import Photo from '../ui/Photo'
import LegendePhoto from '../ui/LegendePhoto'

interface PresentationSejourProps {
  sejour: Sejour
  ancreDemande?: string
  ancreProgramme?: string
}

/** Le séjour pilote : grande photo + informations clés (durée, départ/retour, public, prix). */
export default function PresentationSejour({
  sejour, ancreDemande = ROUTE_DEMANDE, ancreProgramme = '#programme',
}: PresentationSejourProps) {
  const faits = [
    { libelle: 'Durée', valeur: formaterDuree(sejour.duree.jours, sejour.duree.nuits) },
    {
      libelle: 'Départ & retour',
      valeur: sejour.villeDepart === sejour.villeRetour ? sejour.villeDepart : `${sejour.villeDepart} → ${sejour.villeRetour}`,
    },
    { libelle: 'Public', valeur: `${sejour.public} — ${sejour.nombreVoyageurs} personnes` },
    { libelle: 'Prix indicatif', valeur: `${formaterPrix(sejour.prix.montant)} pour ${sejour.prix.pourPersonnes}` },
  ]

  return (
    <section id="sejour" className="section section-sejour" aria-labelledby="sejour-titre">
      <div className="conteneur sejour-grille">
        <figure className="sejour-photo apparition">
          <Photo media={PHOTO_SEJOUR} sizes="(min-width: 1024px) 55vw, 100vw" />
          <LegendePhoto media={PHOTO_SEJOUR} />
        </figure>

        <div className="sejour-texte apparition">
          <p className="surtitre-section">Le séjour pilote {MARQUE.nomCourt}</p>
          <h2 id="sejour-titre">{sejour.nom}</h2>
          <p className="chapo">{sejour.accroche}</p>
          <p className="sejour-destination">{sejour.destination}</p>

          <dl className="faits">
            {faits.map((f) => (
              <div key={f.libelle}>
                <dt>{f.libelle}</dt>
                <dd>{f.valeur}</dd>
              </div>
            ))}
          </dl>
          <p><Badge>Prix indicatif — à confirmer</Badge></p>

          <div className="actions-sejour">
            <LienBouton href={ancreProgramme}>Voir le programme</LienBouton>
            <LienBouton href={ancreDemande} variante="secondaire">Faire une demande</LienBouton>
          </div>
        </div>
      </div>
    </section>
  )
}
