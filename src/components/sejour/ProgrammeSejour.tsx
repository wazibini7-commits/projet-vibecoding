import type { JourProgramme } from '../../domain/types'
import { PHOTOS_PROGRAMME } from '../../data/medias'
import { formaterDureeRoute } from '../../utils/format'
import Section from '../ui/Section'
import Photo from '../ui/Photo'
import LegendePhoto from '../ui/LegendePhoto'
import Badge from '../ui/Badge'
import CarteCircuit from './CarteCircuit'

interface ProgrammeSejourProps {
  programme: JourProgramme[]
  id?: string
}

/**
 * Programme illustré : carte du circuit, puis une carte photographique par journée
 * (route du jour, lieu de la nuit, activités), en sections alternées sur ordinateur.
 */
export default function ProgrammeSejour({ programme, id = 'programme' }: ProgrammeSejourProps) {
  return (
    <Section id={id} titre={`Le programme en ${programme.length} jours`} surtitre="Itinéraire">
      <CarteCircuit programme={programme} />
      <ol className="programme">
        {programme.map((j) => {
          const photo = PHOTOS_PROGRAMME[j.jour]
          return (
            <li key={j.jour} className="jour apparition">
              {photo && (
                <figure className="jour-photo">
                  <Photo media={photo} sizes="(min-width: 1024px) 50vw, 100vw" />
                  <LegendePhoto media={photo} />
                </figure>
              )}
              <div className="jour-texte">
                <p className="jour-num"><span aria-hidden="true">J{j.jour}</span><span className="sr-only">Jour {j.jour}</span></p>
                <h3>{j.titre}</h3>
                <p>{j.description}</p>
                {j.activites.length > 0 && (
                  <ul className="jour-activites">
                    {j.activites.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                )}
                <dl className="jour-infos">
                  {j.route && (
                    <div>
                      <dt>Route</dt>
                      <dd>{j.route.distanceKm} km · environ {formaterDureeRoute(j.route.dureeMinutes)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Nuit</dt>
                    <dd>
                      {j.nuit ? <>{j.nuit.lieu}{j.nuit.aConfirmer && <> <Badge>à confirmer</Badge></>}</> : 'Retour à la maison'}
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="note">
        Itinéraire indicatif, susceptible d'ajustements selon la météo et les partenaires. Distances et temps de route
        estimés, hors arrêts.
      </p>
    </Section>
  )
}
