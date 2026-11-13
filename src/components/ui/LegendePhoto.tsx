import type { Media } from '../../data/medias'

/** Légende : lieu réel + mention « photo d'illustration » si besoin + auteur et licence. */
export default function LegendePhoto({ media, credit = true }: { media: Media; credit?: boolean }) {
  return (
    <figcaption className="legende-photo">
      <span className="legende-lieu">{media.lieu}</span>
      {media.illustration && <span className="legende-illustration"> · Photo d'illustration</span>}
      {credit && (
        <span className="legende-credit"> · © {media.credit.auteur}, {media.credit.licence}</span>
      )}
    </figcaption>
  )
}
