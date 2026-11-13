import { ROUTE_DEMANDE } from '../../utils/navigation'
import { MARQUE } from '../../data/marque'
import { HERO } from '../../data/medias'
import { LienBouton } from '../ui/Bouton'
import Photo from '../ui/Photo'

interface HeroVanlifeProps {
  ancreSejour?: string
  ancreDemande?: string
}

/** Accueil immersif : la marque Vanlife d'abord, puis l'accès au séjour pilote. */
export default function HeroVanlife({ ancreSejour = '#sejour', ancreDemande = ROUTE_DEMANDE }: HeroVanlifeProps) {
  return (
    <section className="hero" aria-labelledby="hero-titre">
      <div className="hero-fond" aria-hidden="true">
        <Photo media={HERO} prioritaire decorative className="hero-image" />
      </div>
      <div className="conteneur hero-contenu">
        <p className="surtitre">{MARQUE.nom} · {MARQUE.activite}</p>
        <h1 id="hero-titre">{MARQUE.signature}</h1>
        <p className="accroche">{MARQUE.presentation}</p>
        <div className="hero-actions">
          <LienBouton href={ancreSejour}>Découvrir Bretagne Sauvage</LienBouton>
          <LienBouton href={ancreDemande} variante="clair">Faire une demande</LienBouton>
        </div>
      </div>
      <p className="hero-credit">
        {HERO.lieu} — © {HERO.credit.auteur}, {HERO.credit.licence}
      </p>
    </section>
  )
}
