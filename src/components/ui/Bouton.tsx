import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'

export type VarianteBouton = 'principal' | 'secondaire' | 'clair'

interface OptionsVisuelles {
  variante?: VarianteBouton
  /** Occupe toute la largeur disponible (pratique sur smartphone). */
  pleineLargeur?: boolean
}

function classes({ variante = 'principal', pleineLargeur }: OptionsVisuelles, extra?: string) {
  return ['btn', `btn-${variante}`, pleineLargeur && 'btn-pleine-largeur', extra].filter(Boolean).join(' ')
}

type BoutonProps = OptionsVisuelles & ButtonHTMLAttributes<HTMLButtonElement>

/** Bouton d'action (cible tactile ≥ 48 px). Par défaut type="button". */
export function Bouton({ variante, pleineLargeur, className, type = 'button', ...reste }: BoutonProps) {
  return <button type={type} className={classes({ variante, pleineLargeur }, className)} {...reste} />
}

type LienBoutonProps = OptionsVisuelles & AnchorHTMLAttributes<HTMLAnchorElement>

/** Lien présenté comme un bouton (navigation vers une ancre de la page). */
export function LienBouton({ variante, pleineLargeur, className, ...reste }: LienBoutonProps) {
  return <a className={classes({ variante, pleineLargeur }, className)} {...reste} />
}
