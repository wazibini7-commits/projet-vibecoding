import type { JourProgramme } from '../../domain/types'
import { PHOTOS_PROGRAMME } from '../../data/medias'
import Section from '../ui/Section'
import Photo from '../ui/Photo'
import LegendePhoto from '../ui/LegendePhoto'

interface ProgrammeSejourProps {
  programme: JourProgramme[]
  id?: string
}

/** Programme illustré : une carte photographique par journée, en sections alternées sur ordinateur. */
export default function ProgrammeSejour({ programme, id = 'programme' }: ProgrammeSejourProps) {
  return (
    <Section id={id} titre={`Le programme en ${programme.length} jours`} surtitre="Itinéraire">
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
              </div>
            </li>
          )
        })}
      </ol>
      <p className="note">Itinéraire indicatif, susceptible d'ajustements selon la météo et les partenaires.</p>
    </Section>
  )
}
