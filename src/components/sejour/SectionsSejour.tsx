// Sections de l'accueil qui dépendent du contenu du séjour (chargé depuis l'API) :
// présentation, programme (avec carte), van, prix, questions fréquentes, galerie, invitation à réserver.
import { useEffect } from 'react'
import { useSejour } from '../../api/requetes'
import { ID_SEJOUR_PILOTE } from '../../data/sejour'
import { ChargementDonnees, ErreurDonnees } from '../ui/EtatDonnees'
import PresentationSejour from './PresentationSejour'
import ProgrammeSejour from './ProgrammeSejour'
import PrixPrestations from './PrixPrestations'
import Galerie from './Galerie'
import FicheVan from './FicheVan'
import FaqSejour from './FaqSejour'
import AppelReservation from './AppelReservation'

export default function SectionsSejour() {
  const { data: sejour, isPending, error, refetch, isFetching } = useSejour(ID_SEJOUR_PILOTE)

  // Adresse visant une section du séjour (#programme…) ouverte avant la fin du chargement :
  // la section n'existait pas encore, on s'y rend dès qu'elle apparaît.
  useEffect(() => {
    if (!sejour) return
    const ancre = window.location.hash.slice(1)
    if (!ancre || ancre.startsWith('/')) return
    document.getElementById(ancre)?.scrollIntoView({ block: 'start' })
  }, [sejour])

  if (isPending) {
    return (
      <section id="sejour" className="section" aria-label="Le séjour">
        <ChargementDonnees texte="Chargement du séjour…" />
      </section>
    )
  }
  if (!sejour) {
    return (
      <section id="sejour" className="section" aria-label="Le séjour">
        <ErreurDonnees
          titre="Le séjour ne peut pas être affiché pour le moment."
          erreur={error}
          enCours={isFetching}
          onReessayer={() => void refetch()}
        />
      </section>
    )
  }
  return (
    <>
      <PresentationSejour sejour={sejour} />
      <ProgrammeSejour programme={sejour.programme} />
      <FicheVan van={sejour.van} />
      <PrixPrestations sejour={sejour} />
      <FaqSejour questions={sejour.faq} />
      <Galerie />
      <AppelReservation sejour={sejour} />
    </>
  )
}
