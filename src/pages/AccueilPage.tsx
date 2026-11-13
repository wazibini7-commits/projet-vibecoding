// Page d'accueil : la marque Vanlife (affichée immédiatement), puis le séjour Bretagne Sauvage
// chargé depuis l'API (présentation, programme, prix, galerie) et l'invitation à faire une demande.
import Header from '../components/layout/Header'
import { LIENS_PRINCIPAUX } from '../components/layout/navigation'
import HeroVanlife from '../components/layout/HeroVanlife'
import ConceptVanlife from '../components/sejour/ConceptVanlife'
import SectionsSejour from '../components/sejour/SectionsSejour'

export default function AccueilPage() {
  return (
    <>
      <Header liens={LIENS_PRINCIPAUX} />
      <main id="contenu" tabIndex={-1} className="page-entree">
        <HeroVanlife />
        <ConceptVanlife />
        <SectionsSejour />
      </main>
    </>
  )
}
