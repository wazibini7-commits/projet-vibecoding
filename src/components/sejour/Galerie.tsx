import { useEffect, useRef, useState } from 'react'
import { GALERIE, type Media } from '../../data/medias'
import Section from '../ui/Section'
import Photo from '../ui/Photo'
import LegendePhoto from '../ui/LegendePhoto'

/**
 * Galerie : grille de photos ; un clic ouvre la photo en grand (boîte de dialogue native,
 * Échap pour fermer, flèches ← → pour naviguer, focus rendu à la vignette à la fermeture).
 */
export default function Galerie({ photos = GALERIE }: { photos?: Media[] }) {
  const [index, setIndex] = useState<number | null>(null)
  const refDialogue = useRef<HTMLDialogElement>(null)
  const refDeclencheur = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const d = refDialogue.current
    if (!d) return
    if (index !== null && !d.open) d.showModal?.()
    if (index === null && d.open) d.close()
  }, [index])

  const fermer = () => {
    setIndex(null)
    refDeclencheur.current?.focus()
  }
  const decaler = (pas: number) => setIndex((i) => (i === null ? i : (i + pas + photos.length) % photos.length))

  const courante = index === null ? null : photos[index]

  return (
    <Section id="galerie" titre="La presqu'île en images" surtitre="Galerie" className="section-sombre">
      <p className="chapo">Falaises, plages, ports et pointes : quelques paysages de la presqu'île de Crozon et de la mer d'Iroise.</p>
      <ul className="galerie">
        {photos.map((m, i) => (
          <li key={m.id} className={`galerie-item galerie-item-${i + 1} apparition`}>
            <button
              type="button"
              className="galerie-bouton"
              onClick={(e) => { refDeclencheur.current = e.currentTarget; setIndex(i) }}
              aria-label={`Agrandir : ${m.lieu}`}
            >
              <Photo media={m} sizes="(min-width: 1024px) 33vw, 50vw" />
              <span className="galerie-lieu" aria-hidden="true">{m.lieu}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={refDialogue}
        className="visionneuse"
        aria-label={courante ? `Photo : ${courante.lieu}` : 'Photo'}
        onClose={() => index !== null && fermer()}
        onClick={(e) => e.target === refDialogue.current && fermer()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') decaler(1)
          if (e.key === 'ArrowLeft') decaler(-1)
        }}
      >
        {courante && (
          <figure className="visionneuse-figure">
            <Photo media={courante} sizes="100vw" />
            <LegendePhoto media={courante} />
          </figure>
        )}
        <div className="visionneuse-actions">
          <button type="button" onClick={() => decaler(-1)} aria-label="Photo précédente">←</button>
          <span aria-live="polite">{index !== null && `${index + 1} / ${photos.length}`}</span>
          <button type="button" onClick={() => decaler(1)} aria-label="Photo suivante">→</button>
          <button type="button" className="visionneuse-fermer" onClick={fermer}>Fermer</button>
        </div>
      </dialog>
    </Section>
  )
}
