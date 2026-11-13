import { useEffect, useRef, useState } from 'react'
import type { Media } from '../../data/medias'
import { animationsReduites, economieDeDonnees } from '../../utils/preferences'
import Photo from './Photo'

interface VideoAmbianceProps {
  src: string
  /** Image affichée avant la lecture, et à la place de la vidéo si elle ne peut pas être lue. */
  affiche: Media
  libelle: string
}

/**
 * Courte vidéo muette en boucle :
 * - chargée seulement quand elle devient visible (preload="none") ;
 * - jamais lue si le visiteur réduit les animations ou économise ses données ;
 * - bouton Pause / Lecture (WCAG 2.2.2) ;
 * - en cas d'erreur, l'image fixe reste affichée.
 */
export default function VideoAmbiance({ src, affiche, libelle }: VideoAmbianceProps) {
  const refVideo = useRef<HTMLVideoElement>(null)
  const [enLecture, setEnLecture] = useState(false)
  const [indisponible, setIndisponible] = useState(false)
  const [autorisee] = useState(() => !animationsReduites() && !economieDeDonnees())

  useEffect(() => {
    const video = refVideo.current
    if (!video || !autorisee || typeof IntersectionObserver === 'undefined') return
    const observateur = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting) video.play().then(() => setEnLecture(true)).catch(() => setEnLecture(false))
      else { video.pause(); setEnLecture(false) }
    }, { threshold: 0.35 })
    observateur.observe(video)
    return () => observateur.disconnect()
  }, [autorisee])

  function basculer() {
    const video = refVideo.current
    if (!video) return
    if (video.paused) video.play().then(() => setEnLecture(true)).catch(() => setIndisponible(true))
    else { video.pause(); setEnLecture(false) }
  }

  if (!autorisee || indisponible) {
    return <Photo media={affiche} sizes="(min-width: 1024px) 50vw, 100vw" className="video-ambiance-media" />
  }

  return (
    <div className="video-ambiance">
      <video
        ref={refVideo}
        className="video-ambiance-media"
        src={src}
        poster={affiche.src.s}
        muted
        loop
        playsInline
        preload="none"
        aria-label={libelle}
        onError={() => setIndisponible(true)}
      />
      <button type="button" className="video-ambiance-bouton" onClick={basculer}>
        {enLecture ? 'Pause' : 'Lecture'}
        <span className="sr-only"> de la vidéo : {libelle}</span>
      </button>
    </div>
  )
}
