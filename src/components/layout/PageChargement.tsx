/** Affiché pendant le chargement d'une page chargée à la demande (React.lazy). */
export default function PageChargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <main id="contenu" className="page-chargement" role="status" aria-live="polite">
      <span className="indicateur-chargement" aria-hidden="true" />
      <p>{texte}</p>
    </main>
  )
}
