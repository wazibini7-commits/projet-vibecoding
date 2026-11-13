import { CONCEPT_VANLIFE, MARQUE } from '../../data/marque'
import { PHOTOS_EXPERIENCE, VIDEO_TAS_DE_POIS } from '../../data/medias'
import Photo from '../ui/Photo'
import LegendePhoto from '../ui/LegendePhoto'
import VideoAmbiance from '../ui/VideoAmbiance'

/**
 * Présentation de l'entreprise et de l'expérience du voyage en van.
 * Les photos de van sont des illustrations : elles ne montrent pas le véhicule Vanlife
 * et ne présentent aucun équipement comme inclus.
 */
export default function ConceptVanlife() {
  return (
    <section id="concept" className="section section-concept" aria-labelledby="concept-titre">
      <div className="conteneur">
        <div className="concept-intro apparition">
          <p className="surtitre-section">{MARQUE.nom}</p>
          <h2 id="concept-titre">La Bretagne, au rythme du van</h2>
          <p className="chapo">
            {MARQUE.nomCourt} imagine des voyages en van aménagé en Bretagne : un itinéraire préparé, des
            paysages côtiers et des expériences présentées simplement. Premier circuit proposé :
            <strong> Bretagne Sauvage</strong>, sur la presqu'île de Crozon et en mer d'Iroise.
          </p>
        </div>

        <ul className="concept-points">
          {CONCEPT_VANLIFE.map((p, i) => (
            <li key={p.titre} className="apparition">
              <span className="concept-num" aria-hidden="true">0{i + 1}</span>
              <h3>{p.titre}</h3>
              <p>{p.texte}</p>
            </li>
          ))}
        </ul>

        {/* Grande case : la photo la plus nette (van) ; la vidéo, en 480p, occupe une case standard. */}
        <div className="mosaique">
          {PHOTOS_EXPERIENCE.slice(0, 1).map((m) => (
            <figure key={m.id} className="mosaique-grand apparition">
              <Photo media={m} sizes="(min-width: 1024px) 50vw, 100vw" />
              <LegendePhoto media={m} />
            </figure>
          ))}
          <figure className="mosaique-video apparition">
            <VideoAmbiance
              src={VIDEO_TAS_DE_POIS.src}
              affiche={VIDEO_TAS_DE_POIS.affiche}
              libelle="Les Tas de Pois filmés depuis la pointe de Pen-Hir"
            />
            <LegendePhoto media={VIDEO_TAS_DE_POIS.affiche} />
          </figure>
          {PHOTOS_EXPERIENCE.slice(1).map((m) => (
            <figure key={m.id} className="mosaique-photo apparition">
              <Photo media={m} sizes="(min-width: 1024px) 25vw, (min-width: 700px) 50vw, 100vw" />
              <LegendePhoto media={m} />
            </figure>
          ))}
        </div>
        <p className="note">
          Photos d'ambiance : le véhicule, son aménagement et les équipements du séjour restent à confirmer par Vanlife.
        </p>
      </div>
    </section>
  )
}
