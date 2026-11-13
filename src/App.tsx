// Point d'entrée de l'interface. Trois écrans publics, plus le back-office :
//   - page d'accueil (#/ ou #section)      : la marque Vanlife et le séjour Bretagne Sauvage ;
//   - page de demande (#/demande)          : formulaire et récapitulatif, chargée à la demande ;
//   - confirmation (après l'envoi)         : affiche la demande enregistrée ;
//   - espace client (#/suivi/…)            : suivi d'une demande par lien personnel ;
//   - back-office (#/admin/…)              : réservé à l'équipe Vanlife, chargé à la demande.
// La navigation repose sur l'adresse après « # » (voir utils/navigation.ts) : le bouton
// « Précédent » du navigateur fonctionne, sans bibliothèque ni réglage d'hébergement.
import { lazy, Suspense, useEffect, useState } from 'react'
import BandeauDemo from './components/layout/BandeauDemo'
import LienEvitement from './components/layout/LienEvitement'
import Footer from './components/layout/Footer'
import PageChargement from './components/layout/PageChargement'
import AccueilPage from './pages/AccueilPage'
import ConfirmationPage from './pages/ConfirmationPage'
import type { DemandeEnregistree } from './domain/types'
import { lireRoute, ROUTE_ACCUEIL, type Position } from './utils/navigation'

// Code de la page de demande téléchargé seulement quand on l'ouvre.
const DemandePage = lazy(() => import('./pages/DemandePage'))
const SuiviPage = lazy(() => import('./pages/SuiviPage'))
// Back-office : jamais téléchargé par les visiteurs du site.
const AdminApp = lazy(() => import('./admin/AdminApp'))

/**
 * Place la page au bon endroit : en haut, ou sur la section demandée.
 * Le défilement doux (CSS) est neutralisé le temps de l'opération : sinon, un défilement
 * animé encore en cours au moment du clic se poursuit après le changement d'écran
 * et laisse la page à mi-hauteur (bug constaté en démonstration).
 */
function positionner(ancre?: string) {
  const cible = ancre ? document.getElementById(ancre) : null
  if (cible) cible.scrollIntoView({ behavior: 'instant', block: 'start' })
  else window.scrollTo({ top: 0, behavior: 'instant' })
}

export default function App() {
  const [position, setPosition] = useState<Position>(() => lireRoute(window.location.hash))
  /** Non nul → écran de confirmation de cette demande simulée. */
  const [demandeEnvoyee, setDemandeEnvoyee] = useState<DemandeEnregistree | null>(null)

  // Suivi de l'adresse : liens, boutons, « Précédent » / « Suivant » du navigateur.
  useEffect(() => {
    function surChangementAdresse() {
      const cible = lireRoute(window.location.hash)
      // Ancre d'une section présente sur l'écran affiché : le navigateur s'en charge seul.
      if (cible.ancre && document.getElementById(cible.ancre)) return
      setDemandeEnvoyee(null)
      setPosition(cible)
    }
    window.addEventListener('hashchange', surChangementAdresse)
    return () => window.removeEventListener('hashchange', surChangementAdresse)
  }, [])

  // À chaque changement d'écran : haut de page (ou section visée), sans animation.
  useEffect(() => {
    const ancre = demandeEnvoyee ? undefined : position.ancre
    const html = document.documentElement
    html.style.scrollBehavior = 'auto'
    positionner(ancre)
    const image = requestAnimationFrame(() => {
      positionner(ancre) // annule une animation déjà lancée
      html.style.scrollBehavior = ''
    })
    return () => cancelAnimationFrame(image)
  }, [position, demandeEnvoyee])

  function retourAccueil() {
    setDemandeEnvoyee(null)
    if (window.location.hash !== ROUTE_ACCUEIL) window.location.hash = ROUTE_ACCUEIL
    else setPosition({ page: 'accueil' })
  }

  if (position.page === 'admin') {
    return (
      <>
        <LienEvitement />
        <Suspense fallback={<PageChargement texte="Chargement de l'administration…" />}>
          <AdminApp chemin={position.chemin ?? '/'} />
        </Suspense>
      </>
    )
  }

  let ecran
  if (demandeEnvoyee) {
    ecran = <ConfirmationPage demande={demandeEnvoyee} onRetour={retourAccueil} />
  } else if (position.page === 'suivi') {
    ecran = (
      <Suspense fallback={<PageChargement texte="Chargement de votre espace…" />}>
        <SuiviPage chemin={position.chemin ?? '/'} />
      </Suspense>
    )
  } else if (position.page === 'demande') {
    ecran = (
      <Suspense fallback={<PageChargement texte="Chargement du formulaire de demande…" />}>
        <DemandePage onDemandeEnvoyee={setDemandeEnvoyee} />
      </Suspense>
    )
  } else {
    ecran = <AccueilPage />
  }

  return (
    <>
      <LienEvitement />
      <BandeauDemo />
      {ecran}
      <Footer />
    </>
  )
}
