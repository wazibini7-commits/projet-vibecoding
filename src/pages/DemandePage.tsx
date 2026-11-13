// Page « Demande de réservation » (adresse #/demande) : formulaire, récapitulatif, envoi au serveur.
// Le séjour et les départs disponibles viennent de l'API ; la demande y est enregistrée.
// Cette page est chargée à la demande (React.lazy, voir App.tsx).
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Header from '../components/layout/Header'
import { LIENS_PRINCIPAUX } from '../components/layout/navigation'
import FormulaireDemande from '../components/demande/FormulaireDemande'
import Recapitulatif from '../components/demande/Recapitulatif'
import ActionsRecapitulatif from '../components/demande/ActionsRecapitulatif'
import { ID_CHAMP } from '../components/demande/champs'
import Badge from '../components/ui/Badge'
import Photo from '../components/ui/Photo'
import { ChargementDonnees, ErreurDonnees } from '../components/ui/EtatDonnees'
import { ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE, envoyerDemande } from '../api/client'
import { cles, useDeparts, useSejour } from '../api/requetes'
import { ID_SEJOUR_PILOTE } from '../data/sejour'
import { PHOTO_SEJOUR } from '../data/medias'
import { MARQUE } from '../data/marque'
import { SAISIE_VIDE, validerChamp, validerDemande } from '../domain/validation'
import type {
  ChampDemande, DemandeEnregistree, DemandeSaisie, DemandeValidee, ErreursDemande, ErreursServeur,
} from '../domain/types'
import { formaterDuree, formaterPrix } from '../utils/format'
import { ROUTE_ACCUEIL, ROUTE_DEMANDE } from '../utils/navigation'

/** Garde uniquement les erreurs des champs du formulaire. */
function erreursDuFormulaire(erreurs: ErreursServeur): ErreursDemande {
  const { prenom, email, dateDepart } = erreurs
  return Object.fromEntries(Object.entries({ prenom, email, dateDepart }).filter(([, m]) => m)) as ErreursDemande
}

interface DemandePageProps {
  /** Appelée avec la demande enregistrée par le serveur. */
  onDemandeEnvoyee: (demande: DemandeEnregistree) => void
}

export default function DemandePage({ onDemandeEnvoyee }: DemandePageProps) {
  const sejourQ = useSejour(ID_SEJOUR_PILOTE)
  const departsQ = useDeparts(ID_SEJOUR_PILOTE)
  const clientRequetes = useQueryClient()

  // Données brutes saisies, erreurs affichées, données validées en attente de vérification.
  const [saisie, setSaisie] = useState<DemandeSaisie>(SAISIE_VIDE)
  const [erreurs, setErreurs] = useState<ErreursDemande>({})
  const [aVerifier, setAVerifier] = useState<DemandeValidee | null>(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  /** Panne pendant l'envoi (serveur injoignable…) : la demande n'est PAS enregistrée. */
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null)
  /** Demande de focus après un changement d'affichage (appliquée par l'effet ci-dessous). */
  const [focusCible, setFocusCible] = useState<'erreurs' | 'recap' | 'formulaire' | 'erreur-envoi' | null>(null)

  const refResume = useRef<HTMLDivElement>(null)
  const refRecap = useRef<HTMLHeadingElement>(null)
  const refTitre = useRef<HTMLHeadingElement>(null)
  const refErreurEnvoi = useRef<HTMLDivElement>(null)

  // Arrivée sur la page : le titre est annoncé aux lecteurs d'écran (sans défilement).
  useEffect(() => {
    refTitre.current?.focus({ preventScroll: true })
  }, [])

  // Le focus est déplacé APRÈS le rendu, quand l'élément visé existe.
  useEffect(() => {
    if (!focusCible) return
    if (focusCible === 'erreurs') refResume.current?.focus()
    if (focusCible === 'recap') refRecap.current?.focus()
    if (focusCible === 'erreur-envoi') refErreurEnvoi.current?.focus()
    if (focusCible === 'formulaire') document.getElementById(ID_CHAMP.prenom)?.focus()
    setFocusCible(null)
  }, [focusCible])

  function majErreurChamp(champ: ChampDemande, valeurs: DemandeSaisie) {
    setErreurs((prec) => {
      const suivantes = { ...prec }
      const message = validerChamp(champ, valeurs)
      if (message) suivantes[champ] = message
      else delete suivantes[champ]
      return suivantes
    })
  }

  function changer(champ: ChampDemande, valeur: string) {
    const valeurs = { ...saisie, [champ]: valeur }
    setSaisie(valeurs)
    if (erreurs[champ]) majErreurChamp(champ, valeurs) // l'erreur disparaît dès que le champ est corrigé
  }

  /** « Vérifier ma demande » : validation complète par le domaine (mêmes règles que le serveur). */
  function verifier() {
    const resultat = validerDemande(saisie)
    if (!resultat.valide) {
      setErreurs(resultat.erreurs)
      setFocusCible('erreurs')
      return
    }
    setErreurs({})
    setErreurEnvoi(null)
    setAVerifier(resultat.donnees)
    setFocusCible('recap')
  }

  function modifier() {
    setAVerifier(null)
    setErreurEnvoi(null)
    setFocusCible('formulaire')
  }

  /** « Envoyer ma demande » : enregistrement par le serveur, qui revérifie tout. */
  async function envoyer() {
    setEnvoiEnCours(true)
    setErreurEnvoi(null)
    try {
      const resultat = await envoyerDemande({ sejourId: ID_SEJOUR_PILOTE, ...saisie })
      if (resultat.ok) {
        // Une place vient d'être prise : la liste des départs devra être rechargée.
        void clientRequetes.invalidateQueries({ queryKey: cles.departs(ID_SEJOUR_PILOTE) })
        onDemandeEnvoyee(resultat.demande)
        return
      }
      // Refus du serveur (départ devenu complet, doublon, date devenue passée…) : retour au formulaire.
      if (resultat.departIndisponible) await departsQ.refetch()
      setAVerifier(null)
      setErreurs(erreursDuFormulaire(resultat.erreurs))
      setFocusCible('erreurs')
    } catch (e) {
      setErreurEnvoi(e instanceof ErreurApi ? e.message : MESSAGE_SERVEUR_INJOIGNABLE)
      setFocusCible('erreur-envoi')
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const sejour = sejourQ.data
  const departs = departsQ.data

  let contenu
  if (sejourQ.isPending || departsQ.isPending) {
    contenu = <ChargementDonnees texte="Chargement des départs disponibles…" />
  } else if (!sejour || !departs) {
    const enErreur = sejourQ.isError ? sejourQ : departsQ
    contenu = (
      <ErreurDonnees
        titre="Impossible d'afficher le formulaire de demande."
        erreur={enErreur.error}
        enCours={sejourQ.isFetching || departsQ.isFetching}
        onReessayer={() => { void sejourQ.refetch(); void departsQ.refetch() }}
      />
    )
  } else {
    const ouverts = departs.filter((d) => !d.complet)
    contenu = (
      <div className="conteneur demande-grille">
        {/* Rappel du séjour choisi (au-dessus du formulaire sur mobile, à droite sur ordinateur). */}
        <aside className="carte resume-sejour" aria-labelledby="resume-sejour-titre">
          <Photo media={PHOTO_SEJOUR} sizes="(min-width: 1024px) 360px, 100vw" className="resume-sejour-photo" />
          <div className="resume-sejour-texte">
            <h2 id="resume-sejour-titre" className="h3">Votre séjour : {sejour.nom}</h2>
            <ul>
              <li>{formaterDuree(sejour.duree.jours, sejour.duree.nuits)}</li>
              <li>{sejour.nombreVoyageurs} personnes</li>
              <li>Départ et retour : {sejour.villeDepart}</li>
              <li><strong>{formaterPrix(sejour.prix.montant)} pour {sejour.prix.pourPersonnes}</strong> <Badge>à confirmer</Badge></li>
            </ul>
            <a href="#programme">Voir le programme</a>
          </div>
        </aside>

        <section id="demande" className="demande-formulaire" aria-labelledby="demande-titre">
          <p className="alerte alerte-info">
            <strong>Sans engagement :</strong> votre demande est enregistrée, puis Vanlife vérifie la
            disponibilité et vous recontacte. Aucun paiement n'est demandé à ce stade.
          </p>
          {ouverts.length === 0 ? (
            <div className="alerte alerte-info" role="status">
              <p><strong>Aucun départ n'est ouvert à la réservation pour le moment.</strong></p>
              <p>Revenez bientôt : de nouvelles dates seront publiées.</p>
            </div>
          ) : aVerifier ? (
            <Recapitulatif ref={refRecap} sejour={sejour} donnees={aVerifier}>
              {erreurEnvoi && (
                <div ref={refErreurEnvoi} className="alerte alerte-erreur" role="alert" tabIndex={-1}>
                  <p><strong>Votre demande n'a pas été envoyée.</strong></p>
                  <p>{erreurEnvoi}</p>
                </div>
              )}
              <ActionsRecapitulatif onModifier={modifier} onEnvoyer={envoyer} envoiEnCours={envoiEnCours} />
            </Recapitulatif>
          ) : (
            <FormulaireDemande
              saisie={saisie}
              erreurs={erreurs}
              departs={departs}
              onChangement={changer}
              onSortieChamp={(champ) => majErreurChamp(champ, saisie)}
              onValider={verifier}
              aideDate={`Départ de ${sejour.villeDepart}, retour ${sejour.duree.jours - 1} jours plus tard.`}
              refResumeErreurs={refResume}
            />
          )}
        </section>
      </div>
    )
  }

  return (
    <>
      <Header liens={LIENS_PRINCIPAUX} lienActif={ROUTE_DEMANDE} lienLogo={ROUTE_ACCUEIL} />
      <main id="contenu" tabIndex={-1} className="page-entree">
        <div className="demande-entete">
          <div className="conteneur">
            <a className="lien-retour" href="#sejour">← Retour au séjour</a>
            <p className="surtitre">{sejour ? `${sejour.nom} · ` : ''}séjour pilote {MARQUE.nomCourt}</p>
            <h1 id="demande-titre" ref={refTitre} tabIndex={-1}>Demande de réservation</h1>
            <p className="accroche">
              Choisissez une date de départ et indiquez vos coordonnées. Vanlife reviendra vers vous pour
              confirmer la réservation.
            </p>
          </div>
        </div>
        {contenu}
      </main>
    </>
  )
}
