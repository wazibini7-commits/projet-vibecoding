import type { ReactNode } from 'react'

interface SectionProps {
  /** Identifiant servant d'ancre (#id) et de base à l'id du titre. */
  id: string
  titre: string
  /** Petit libellé au-dessus du titre (ex. « Itinéraire »). */
  surtitre?: string
  /** Fond alterné pour rythmer la page. */
  alternee?: boolean
  /** Conteneur étroit (formulaire, récapitulatif). */
  etroite?: boolean
  /** Classe supplémentaire (ex. « section-sombre »). */
  className?: string
  children: ReactNode
}

/** Section de page avec titre h2 relié par aria-labelledby. */
export default function Section({ id, titre, surtitre, alternee, etroite, className, children }: SectionProps) {
  const classes = ['section', alternee && 'section-alt', className].filter(Boolean).join(' ')
  return (
    <section id={id} className={classes} aria-labelledby={`${id}-titre`}>
      <div className={`conteneur${etroite ? ' conteneur-etroit' : ''}`}>
        {surtitre && <p className="surtitre-section">{surtitre}</p>}
        <h2 id={`${id}-titre`}>{titre}</h2>
        {children}
      </div>
    </section>
  )
}
