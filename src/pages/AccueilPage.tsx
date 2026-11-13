// Page d'accueil : la marque Vanlife, puis le séjour Bretagne Sauvage (présentation, programme,
// prix, galerie) et une invitation à ouvrir la page de demande de réservation.
import Header from '../components/layout/Header'
import { LIENS_PRINCIPAUX } from '../components/layout/navigation'
import HeroVanlife from '../components/layout/HeroVanlife'
import ConceptVanlife from '../components/sejour/ConceptVanlife'
import PresentationSejour from '../components/sejour/PresentationSejour'
import ProgrammeSejour from '../components/sejour/ProgrammeSejour'
import PrixPrestations from '../components/sejour/PrixPrestations'
import Galerie from '../components/sejour/Galerie'
import AppelReservation from '../components/sejour/AppelReservation'
import { SEJOUR_BRETAGNE_SAUVAGE as sejour } from '../data/sejour'

export default function AccueilPage() {
  return (
    <>
      <Header liens={LIENS_PRINCIPAUX} />
      <main id="contenu" tabIndex={-1} className="page-entree">
        <HeroVanlife />
        <ConceptVanlife />
        <PresentationSejour sejour={sejour} />
        <ProgrammeSejour programme={sejour.programme} />
        <PrixPrestations sejour={sejour} />
        <Galerie />
        <AppelReservation sejour={sejour} />
      </main>
    </>
  )
}
