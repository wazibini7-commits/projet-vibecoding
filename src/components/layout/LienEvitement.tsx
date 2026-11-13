/** « Aller au contenu » : permet au clavier de sauter l'en-tête (WCAG 2.4.1). */
export default function LienEvitement({ cible = '#contenu' }: { cible?: string }) {
  return <a className="lien-evitement" href={cible}>Aller au contenu principal</a>
}
