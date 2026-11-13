import type { FicheVan as Fiche } from '../../domain/types'
import { PHOTO_VAN } from '../../data/medias'
import Section from '../ui/Section'
import Photo from '../ui/Photo'
import LegendePhoto from '../ui/LegendePhoto'
import Badge from '../ui/Badge'

/** Fiche du van : présentation et équipement, clairement indiqués comme indicatifs. */
export default function FicheVan({ van, id = 'van' }: { van: Fiche; id?: string }) {
  return (
    <Section id={id} titre="Votre van" surtitre="Équipement indicatif">
      <div className="van-grille">
        <figure className="van-photo">
          <Photo media={PHOTO_VAN} sizes="(min-width: 1024px) 45vw, 100vw" />
          <LegendePhoto media={PHOTO_VAN} />
        </figure>
        <div>
          <p className="chapo">{van.presentation}</p>
          <dl className="van-equipements">
            {van.equipements.map((e) => (
              <div key={e.categorie} className="carte">
                <dt>{e.categorie}</dt>
                <dd>{e.detail}</dd>
              </div>
            ))}
          </dl>
          <Badge>Équipement indicatif — modèle à confirmer</Badge>
        </div>
      </div>
    </Section>
  )
}
