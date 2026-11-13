import type { Sejour } from '../../domain/types'
import { formaterDuree, formaterListe, formaterPrix } from '../../utils/format'
import Section from '../ui/Section'
import Badge from '../ui/Badge'

interface PrixPrestationsProps {
  sejour: Sejour
  id?: string
}

/** Prix indicatif + distinction claire « inclus » / « à prévoir » (cahier des charges § 9.2). */
export default function PrixPrestations({ sejour, id = 'prix' }: PrixPrestationsProps) {
  return (
    <Section id={id} titre="Prix et prestations" surtitre="Tarif indicatif" alternee>
      <div className="grille-prix">
      <div className="carte prix-carte">
        <p className="prix-montant">
          {formaterPrix(sejour.prix.montant)} <span className="prix-pour">pour {sejour.prix.pourPersonnes}</span>
        </p>
        <p className="prix-detail">
          {formaterDuree(sejour.duree.jours, sejour.duree.nuits)} · {sejour.nombreVoyageurs} personnes
        </p>
        <Badge>Prix indicatif — à confirmer</Badge>
      </div>

      <div className="colonnes">
        <div className="carte liste-bloc inclus">
          <h3>Inclus dans le prix</h3>
          <ul>{sejour.prestationsIncluses.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div className="carte liste-bloc a-prevoir">
          <h3>À prévoir en plus</h3>
          <ul>{sejour.depensesAPrevoir.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      </div>
      </div>

      <p className="note">
        À confirmer par Vanlife : {formaterListe(sejour.elementsAConfirmer)}.
      </p>
    </Section>
  )
}
