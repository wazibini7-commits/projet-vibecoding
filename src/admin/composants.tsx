// Éléments communs du back-office.
import type { ReactNode } from 'react'
import { MARQUE } from '../data/marque'
import { LIBELLES_ROLE, LIBELLES_STATUT, type UtilisateurConnecte } from '../domain/admin'
import type { StatutDemande } from '../domain/types'
import { ROUTE_ADMIN } from '../utils/navigation'

const LIENS = [
  { chemin: '/', libelle: 'Demandes' },
  { chemin: '/departs', libelle: 'Départs' },
  { chemin: '/compte', libelle: 'Mon compte' },
]

interface EnteteAdminProps {
  utilisateur: UtilisateurConnecte | null
  /** Rubrique active (pour aria-current). */
  rubrique?: string
  onDeconnexion?: () => void
}

export function EnteteAdmin({ utilisateur, rubrique, onDeconnexion }: EnteteAdminProps) {
  return (
    <header className="admin-entete">
      <div className="admin-conteneur admin-entete-interieur">
        <a className="admin-logo" href={utilisateur ? `${ROUTE_ADMIN}` : '#/'}>
          <span className="logo-nom">{MARQUE.nom}</span>
          <span className="admin-logo-sous-titre">Administration</span>
        </a>
        {utilisateur && (
          <>
            <nav className="admin-navigation" aria-label="Administration">
              {LIENS.map((l) => (
                <a
                  key={l.chemin}
                  href={`${ROUTE_ADMIN}${l.chemin === '/' ? '' : l.chemin}`}
                  aria-current={rubrique === l.chemin ? 'page' : undefined}
                >
                  {l.libelle}
                </a>
              ))}
            </nav>
            <div className="admin-utilisateur">
              <span>
                {utilisateur.nom}
                <span className="admin-role">{LIBELLES_ROLE[utilisateur.role]}</span>
              </span>
              <button type="button" className="admin-lien-bouton" onClick={onDeconnexion}>Se déconnecter</button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export function PastilleStatut({ statut }: { statut: StatutDemande }) {
  return <span className={`pastille-statut pastille-${statut.toLowerCase()}`}>{LIBELLES_STATUT[statut]}</span>
}

/** Message de réussite ou d'erreur, annoncé aux lecteurs d'écran. */
export function Retour({ type, children }: { type: 'succes' | 'erreur'; children: ReactNode }) {
  return (
    <div className={`alerte ${type === 'succes' ? 'alerte-succes' : 'alerte-erreur'}`} role={type === 'erreur' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
