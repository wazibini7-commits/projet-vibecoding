// Back-office Vanlife (#/admin/…) : chargé seulement quand on l'ouvre, jamais par les visiteurs du site.
// Personne n'est connecté → page de connexion, quelle que soit l'adresse demandée ; après connexion,
// on arrive sur la page demandée.
import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, clesAdmin, definirSurSessionPerdue } from './api'
import { EnteteAdmin } from './composants'
import ConnexionPage from './pages/ConnexionPage'
import ListeDemandesPage from './pages/ListeDemandesPage'
import DetailDemandePage from './pages/DetailDemandePage'
import DepartsPage from './pages/DepartsPage'
import ComptePage from './pages/ComptePage'
import { ChargementDonnees, ErreurDonnees } from '../components/ui/EtatDonnees'
import { ROUTE_ADMIN } from '../utils/navigation'
import './admin.css'

/** Rubrique du menu correspondant au chemin. */
function rubrique(chemin: string): string {
  if (chemin.startsWith('/departs')) return '/departs'
  if (chemin.startsWith('/compte')) return '/compte'
  return '/'
}

export default function AdminApp({ chemin }: { chemin: string }) {
  const client = useQueryClient()
  const moi = useQuery({ queryKey: clesAdmin.moi, queryFn: api.moi, staleTime: 60_000, retry: false })

  // Pages internes : pas d'indexation par les moteurs de recherche, titre d'onglet explicite.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const titre = document.title
    document.title = 'Administration — Vanlife'
    return () => {
      meta.remove()
      document.title = titre
    }
  }, [])

  // Plus personne de connecté : retour à la connexion, données des demandes effacées de la mémoire.
  // (L'état « moi » est mis à null, pas supprimé : l'écran l'observe et bascule aussitôt.)
  const oublierSession = useCallback(() => {
    client.removeQueries({ queryKey: ['admin'], predicate: (q) => q.queryKey[1] !== 'moi' })
    client.setQueryData(clesAdmin.moi, null)
  }, [client])

  // Session expirée ou fermée pendant l'utilisation.
  useEffect(() => {
    definirSurSessionPerdue(oublierSession)
    return () => definirSurSessionPerdue(() => {})
  }, [oublierSession])

  async function deconnecter() {
    try {
      await api.deconnexion()
    } finally {
      oublierSession()
      window.location.hash = ROUTE_ADMIN
    }
  }

  const utilisateur = moi.data ?? null
  let page
  if (moi.isPending) {
    page = <ChargementDonnees texte="Vérification de la connexion…" />
  } else if (moi.isError) {
    page = <ErreurDonnees titre="Le serveur ne répond pas." erreur={moi.error} enCours={moi.isFetching} onReessayer={() => void moi.refetch()} />
  } else if (!utilisateur) {
    page = <ConnexionPage onConnecte={(u) => client.setQueryData(clesAdmin.moi, u)} />
  } else if (chemin.startsWith('/demandes/')) {
    page = <DetailDemandePage reference={decodeURIComponent(chemin.slice('/demandes/'.length))} />
  } else if (chemin === '/departs') {
    page = <DepartsPage utilisateur={utilisateur} />
  } else if (chemin === '/compte') {
    page = <ComptePage utilisateur={utilisateur} />
  } else {
    page = <ListeDemandesPage />
  }

  return (
    <div className="admin">
      <EnteteAdmin utilisateur={utilisateur} rubrique={rubrique(chemin)} onDeconnexion={deconnecter} />
      <main id="contenu" tabIndex={-1} className="admin-conteneur admin-principal">
        {page}
      </main>
    </div>
  )
}
