// Page « Demande de réservation » (adresse #/demande) : formulaire, récapitulatif, envoi simulé.
// La logique du formulaire est celle de l'ancienne section de l'accueil, déplacée sans modification.
// Cette page est chargée à la demande (React.lazy, voir App.tsx).
import { useEffect, useRef, useState } from 'react'
import Header from '../components/layout/Header'
import { LIENS_PRINCIPAUX } from '../components/layout/navigation'
import FormulaireDemande from '../components/demande/FormulaireDemande'
import Recapitulatif from '../components/demande/Recapitulatif'
import ActionsRecapitulatif from '../components/demande/ActionsRecapitulatif'
import { ID_CHAMP } from '../components/demande/champs'
import Badge from '../components/ui/Badge'
import Photo from '../components/ui/Photo'
import { SEJOUR_BRETAGNE_SAUVAGE as sejour } from '../data/sejour'
import { PHOTO_SEJOUR } from '../data/medias'
import { MARQUE } from '../data/marque'
import { MESSAGES, SAISIE_VIDE, validerChamp, validerDemande } from '../domain/validation'
import { creerDemande } from '../domain/demande'
import type { ChampDemande, DemandeReservation, DemandeSaisie, DemandeValidee, ErreursDemande } from '../domain/types'
import { ajouterJours, aujourdhuiIso } from '../utils/dates'
import { formaterDuree, formaterPrix } from '../utils/format'
import { ROUTE_ACCUEIL, ROUTE_DEMANDE } from '../utils/navigation'

/**
 * Un champ date partiellement rempli (ex. « 14/05/ ») a une valeur vide pour le code,
 * alors que le visiteur voit du texte. Le navigateur le signale via validity.badInput :
 * on affiche alors « date incomplète » au lieu de « choisissez une date ».
 */
function dateSaisieIncomplete(): boolean {
  const champ = document.getElementById(ID_CHAMP.dateDepart)
  return champ instanceof HTMLInputElement && champ.validity.badInput
}

interface DemandePageProps {
  /** Appelée avec la demande simulée créée par le domaine. */
  onDemandeEnvoyee: (demande: DemandeReservation) => void
}

export default function DemandePage({ onDemandeEnvoyee }: DemandePageProps) {
  // Données brutes saisies, erreurs affichées, données validées en attente de vérification.
  const [saisie, setSaisie] = useState<DemandeSaisie>(SAISIE_VIDE)
  const [erreurs, setErreurs] = useState<ErreursDemande>({})
  const [aVerifier, setAVerifier] = useState<DemandeValidee | null>(null)
  /** Demande de focus après un changement d'affichage (appliquée par l'effet ci-dessous). */
  const [focusCible, setFocusCible] = useState<'erreurs' | 'recap' | 'formulaire' | null>(null)

  const refResume = useRef<HTMLDivElement>(null)
  const refRecap = useRef<HTMLHeadingElement>(null)
  const refTitre = useRef<HTMLHeadingElement>(null)

  // Arrivée sur la page : le titre est annoncé aux lecteurs d'écran (sans défilement).
  useEffect(() => {
    refTitre.current?.focus({ preventScroll: true })
  }, [])

  // Le focus est déplacé APRÈS le rendu, quand l'élément visé existe.
  useEffect(() => {
    if (!focusCible) return
    if (focusCible === 'erreurs') refResume.current?.focus()
    if (focusCible === 'recap') refRecap.current?.focus()
    if (focusCible === 'formulaire') document.getElementById(ID_CHAMP.prenom)?.focus()
    setFocusCible(null)
  }, [focusCible])

  function majErreurChamp(champ: ChampDemande, valeurs: DemandeSaisie) {
    setErreurs((prec) => {
      const suivantes = { ...prec }
      const message = champ === 'dateDepart' && dateSaisieIncomplete()
        ? MESSAGES.dateIncomplete
        : validerChamp(champ, valeurs)
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

  /** « Vérifier ma demande » : validation complète par le domaine. */
  function verifier() {
    const resultat = validerDemande(saisie)
    if (!resultat.valide) {
      const erreursAffichees = { ...resultat.erreurs }
      if (resultat.erreurs.dateDepart === MESSAGES.dateVide && dateSaisieIncomplete()) {
        erreursAffichees.dateDepart = MESSAGES.dateIncomplete
      }
      setErreurs(erreursAffichees)
      setFocusCible('erreurs')
      return
    }
    setErreurs({})
    setAVerifier(resultat.donnees)
    setFocusCible('recap')
  }

  function modifier() {
    setAVerifier(null)
    setFocusCible('formulaire')
  }

  /** « Envoyer (simulation) » : le domaine crée la demande (revalidation incluse). */
  function envoyer() {
    const resultat = creerDemande(saisie, sejour)
    if (resultat.ok) {
      onDemandeEnvoyee(resultat.demande)
    } else {
      // Cas limite : la date est devenue invalide entre-temps (ex. passage de minuit).
      setAVerifier(null)
      setErreurs(resultat.erreurs)
      setFocusCible('erreurs')
    }
  }

  return (
    <>
      <Header liens={LIENS_PRINCIPAUX} lienActif={ROUTE_DEMANDE} lienLogo={ROUTE_ACCUEIL} />
      <main id="contenu" tabIndex={-1} className="page-entree">
        <div className="demande-entete">
          <div className="conteneur">
            <a className="lien-retour" href="#sejour">← Retour au séjour</a>
            <p className="surtitre">{sejour.nom} · séjour pilote {MARQUE.nomCourt}</p>
            <h1 id="demande-titre" ref={refTitre} tabIndex={-1}>Demande de réservation</h1>
            <p className="accroche">
              Indiquez vos coordonnées et la date de départ souhaitée. Vanlife reviendra vers vous pour
              confirmer les disponibilités.
            </p>
          </div>
        </div>

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
              <strong>Envoi simulé :</strong> aucune donnée n'est transmise et aucune réservation n'est enregistrée.
            </p>
            {aVerifier ? (
              <Recapitulatif ref={refRecap} sejour={sejour} donnees={aVerifier}>
                <ActionsRecapitulatif onModifier={modifier} onEnvoyer={envoyer} />
              </Recapitulatif>
            ) : (
              <FormulaireDemande
                saisie={saisie}
                erreurs={erreurs}
                onChangement={changer}
                onSortieChamp={(champ) => majErreurChamp(champ, saisie)}
                onValider={verifier}
                dateMin={ajouterJours(aujourdhuiIso(), 1)}
                aideDate={`Départ de ${sejour.villeDepart}, retour ${sejour.duree.jours - 1} jours plus tard.`}
                refResumeErreurs={refResume}
              />
            )}
          </section>
        </div>
      </main>
    </>
  )
}
