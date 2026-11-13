import type { LienNavigation } from './Header'
import { ROUTE_DEMANDE } from '../../utils/navigation'

/**
 * Menu principal, identique sur toutes les pages.
 * Les ancres (#programme…) ramènent à la section correspondante de l'accueil, même
 * depuis la page de demande ; « Demande » ouvre la page de réservation.
 */
export const LIENS_PRINCIPAUX: LienNavigation[] = [
  { libelle: 'Vanlife', href: '#concept' },
  { libelle: 'Le séjour', href: '#sejour' },
  { libelle: 'Programme', href: '#programme' },
  { libelle: 'Le van', href: '#van' },
  { libelle: 'Prix', href: '#prix' },
  { libelle: 'FAQ', href: '#faq' },
  { libelle: 'Galerie', href: '#galerie' },
  { libelle: 'Demande', href: ROUTE_DEMANDE, principal: true },
]
