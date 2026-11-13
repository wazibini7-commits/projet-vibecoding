import type { Media } from '../../data/medias'

interface PhotoProps {
  media: Media
  /** Attribut sizes : largeur d'affichage, pour que le navigateur choisisse la bonne taille. */
  sizes?: string
  className?: string
  /** Image visible dès l'arrivée (accueil) : chargement prioritaire, pas de lazy loading. */
  prioritaire?: boolean
  /** Alternative vide : image purement décorative (le texte voisin suffit). */
  decorative?: boolean
}

/**
 * Photographie responsive : 2 tailles (800 px / grande), chargement différé,
 * dimensions réservées (pas de saut de mise en page).
 */
export default function Photo({ media, sizes = '100vw', className, prioritaire = false, decorative = false }: PhotoProps) {
  return (
    <img
      className={className}
      src={media.src.l}
      srcSet={`${media.src.s} 800w, ${media.src.l} ${media.largeur}w`}
      sizes={sizes}
      width={media.largeur}
      height={media.hauteur}
      alt={decorative ? '' : media.alt}
      loading={prioritaire ? 'eager' : 'lazy'}
      decoding={prioritaire ? 'sync' : 'async'}
      fetchPriority={prioritaire ? 'high' : 'auto'}
    />
  )
}
