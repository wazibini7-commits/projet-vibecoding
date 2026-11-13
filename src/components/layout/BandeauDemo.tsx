import { MENTION_DEMO } from '../../data/sejour'

interface BandeauDemoProps {
  /** Texte affiché ; par défaut la mention obligatoire exacte (cahier des charges § 9.3). */
  texte?: string
}

/** Bandeau de démonstration, visible en permanence en haut de chaque écran. */
export default function BandeauDemo({ texte = MENTION_DEMO }: BandeauDemoProps) {
  return (
    <div className="bandeau-demo" role="note">
      <strong>{texte}</strong>
    </div>
  )
}
