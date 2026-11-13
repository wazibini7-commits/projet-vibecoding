import { useEffect, useId, useState } from 'react'
import { MARQUE } from '../../data/marque'

export interface LienNavigation {
  libelle: string
  /** Ancre interne, ex. « #programme ». */
  href: string
  /** Lien mis en avant (appel à l'action). */
  principal?: boolean
}

interface HeaderProps {
  /** Liens d'accès direct ; aucun lien → navigation masquée (ex. écran de confirmation). */
  liens?: LienNavigation[]
  /** Lien correspondant à la page affichée (signalé par aria-current). */
  lienActif?: string
  /** Destination du logo (par défaut : haut de la page courante). */
  lienLogo?: string
  /** Action du logo (ex. retour à la page principale depuis la confirmation). */
  onLogo?: () => void
}

/**
 * En-tête collant : marque VANLIFE.BZH + navigation.
 * Sur petit écran, la navigation passe dans un menu déroulant (bouton « Menu »).
 */
export default function Header({ liens = [], lienActif, lienLogo = '#contenu', onLogo }: HeaderProps) {
  const [ouvert, setOuvert] = useState(false)
  const idMenu = useId()

  // Échap ferme le menu.
  useEffect(() => {
    if (!ouvert) return
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false)
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [ouvert])

  const logo = (
    <>
      <span className="logo-nom">{MARQUE.nom}</span>
      <span className="logo-activite">{MARQUE.activite}</span>
    </>
  )

  return (
    <header className="site-header">
      <div className="conteneur header-interieur">
        {onLogo ? (
          <button type="button" className="logo logo-bouton" onClick={onLogo} aria-label={`${MARQUE.nom} — retour à l'accueil`}>
            {logo}
          </button>
        ) : (
          <a className="logo" href={lienLogo} aria-label={`${MARQUE.nom} — ${lienLogo === '#contenu' ? 'haut de page' : "retour à l'accueil"}`}>{logo}</a>
        )}

        {liens.length > 0 && (
          <>
            <button
              type="button"
              className="menu-bouton"
              aria-expanded={ouvert}
              aria-controls={idMenu}
              onClick={() => setOuvert((o) => !o)}
            >
              <span className="menu-icone" aria-hidden="true" />
              {ouvert ? 'Fermer' : 'Menu'}
            </button>
            <nav id={idMenu} className={`navigation${ouvert ? ' navigation-ouverte' : ''}`} aria-label="Sections de la page">
              {liens.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={l.principal ? 'nav-cta' : undefined}
                  aria-current={l.href === lienActif ? 'page' : undefined}
                  onClick={() => setOuvert(false)}
                >
                  {l.libelle}
                </a>
              ))}
            </nav>
          </>
        )}
      </div>
    </header>
  )
}
