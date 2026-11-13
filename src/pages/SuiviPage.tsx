// Espace client (#/suivi) : suivi d'une demande grâce au lien personnel reçu par e-mail.
//   « #/suivi »                       → formulaire « J'ai perdu mon lien » (référence + e-mail → nouveau lien par e-mail) ;
//   « #/suivi/VL-2027-0001/<secret> » → la demande : étapes, récapitulatif, messages avec Vanlife, annulation.
// Chargée à la demande (React.lazy, voir App.tsx).
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '../components/layout/Header'
import { LIENS_PRINCIPAUX } from '../components/layout/navigation'
import ChampFormulaire from '../components/ui/ChampFormulaire'
import ListeRecap from '../components/ui/ListeRecap'
import Badge from '../components/ui/Badge'
import { Bouton, LienBouton } from '../components/ui/Bouton'
import { ChargementDonnees, ErreurDonnees } from '../components/ui/EtatDonnees'
import { annulerDemande, demanderLienSuivi, ecrireAVanlife, lireSuivi } from '../api/client'
import {
  ETAPES_SUIVI, MESSAGE_SUIVI_LONGUEUR_MAX, MOTIF_ANNULATION_LONGUEUR_MAX,
  type AccesSuivi, type SuiviDemande,
} from '../domain/suivi'
import { formaterDateFr } from '../utils/dates'
import { formaterPrix } from '../utils/format'
import { ROUTE_ACCUEIL, ROUTE_DEMANDE, ROUTE_SUIVI } from '../utils/navigation'

const cleSuivi = (acces: AccesSuivi) => ['suivi', acces.reference, acces.jeton] as const

/** « /VL-2027-0001/secret » → accès ; « / » → aucun. */
function lireAcces(chemin: string): AccesSuivi | null {
  const [reference, jeton] = chemin.split('/').filter(Boolean).map(decodeURIComponent)
  return reference && jeton ? { reference, jeton } : null
}

function heure(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

// ---------- Lien perdu ----------

function DemanderLien({ referenceInitiale = '', intro }: { referenceInitiale?: string; intro: string }) {
  const [reference, setReference] = useState(referenceInitiale)
  const [email, setEmail] = useState('')
  const [erreurs, setErreurs] = useState<{ reference?: string; email?: string }>({})
  const mutation = useMutation({ mutationFn: () => demanderLienSuivi(reference.trim(), email.trim()) })
  const refResultat = useRef<HTMLDivElement>(null)
  useEffect(() => { if (mutation.isSuccess || mutation.isError) refResultat.current?.focus() }, [mutation.isSuccess, mutation.isError])

  function valider(e: FormEvent) {
    e.preventDefault()
    const nouvelles = {
      reference: reference.trim() ? undefined : 'Indiquez la référence de votre demande (ex. VL-2027-0042).',
      email: email.trim() ? undefined : "Indiquez l'adresse e-mail utilisée pour la demande.",
    }
    setErreurs(nouvelles)
    if (!nouvelles.reference && !nouvelles.email) mutation.mutate()
  }

  return (
    <section className="carte suivi-carte" aria-labelledby="titre-lien">
      <h2 id="titre-lien" className="h3">Recevoir mon lien de suivi</h2>
      <p>{intro}</p>
      {mutation.isSuccess ? (
        <div ref={refResultat} tabIndex={-1} className="alerte alerte-info" role="status">
          <p><strong>{mutation.data}</strong></p>
          <p>Pensez à vérifier vos courriers indésirables.</p>
        </div>
      ) : (
        <form onSubmit={valider} noValidate>
          {mutation.isError && (
            <div ref={refResultat} tabIndex={-1} className="alerte alerte-erreur" role="alert">{mutation.error.message}</div>
          )}
          <ChampFormulaire id="suivi-reference" libelle="Référence de la demande" valeur={reference} onValeur={setReference}
            erreur={erreurs.reference} placeholder="Ex. : VL-2027-0042" autoComplete="off" />
          <ChampFormulaire id="suivi-email" type="email" libelle="Adresse e-mail utilisée pour la demande" valeur={email}
            onValeur={setEmail} erreur={erreurs.email} autoComplete="email" inputMode="email" />
          <Bouton type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Envoi…' : 'Recevoir le lien par e-mail'}</Bouton>
        </form>
      )}
    </section>
  )
}

// ---------- Demande ----------

function Etapes({ suivi }: { suivi: SuiviDemande }) {
  if (suivi.statut === 'REFUSEE' || suivi.statut === 'ANNULEE') {
    return (
      <div className="alerte alerte-info suivi-cloture" role="status">
        <p><strong>{suivi.statut === 'ANNULEE' ? 'Demande annulée' : 'Demande non retenue'}</strong></p>
        <p>
          {suivi.statut === 'ANNULEE'
            ? 'Cette demande est annulée : aucun frais ne vous est demandé.'
            : "Vanlife n'a pas pu accepter cette demande pour cette date."}{' '}
          <a href={ROUTE_DEMANDE}>Faire une nouvelle demande</a>
        </p>
      </div>
    )
  }
  const position = ETAPES_SUIVI.findIndex((e) => e.statut === suivi.statut)
  return (
    <ol className="suivi-etapes">
      {ETAPES_SUIVI.map((e, i) => {
        const etat = i < position ? 'faite' : i === position ? 'en-cours' : 'a-venir'
        return (
          <li key={e.statut} className={`suivi-etape suivi-etape-${etat}`} aria-current={etat === 'en-cours' ? 'step' : undefined}>
            <span className="suivi-etape-pastille" aria-hidden="true">{i < position ? '✓' : i + 1}</span>
            <span>
              <strong>{e.libelle}</strong>
              <span className="sr-only"> — {etat === 'faite' ? 'étape passée' : etat === 'en-cours' ? 'étape actuelle' : 'à venir'}</span>
              {etat === 'en-cours' && <span className="suivi-etape-texte">{e.explication}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Messages({ suivi, acces }: { suivi: SuiviDemande; acces: AccesSuivi }) {
  const client = useQueryClient()
  const [texte, setTexte] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const mutation = useMutation({
    mutationFn: () => ecrireAVanlife(acces, texte),
    onSuccess: (maj) => {
      client.setQueryData(cleSuivi(acces), maj)
      setTexte('')
      setEnvoye(true)
    },
  })
  return (
    <section className="carte suivi-carte" aria-labelledby="titre-messages">
      <h2 id="titre-messages" className="h3">Échanger avec Vanlife</h2>
      {suivi.messages.length === 0 ? (
        <p className="suivi-discret">Une question sur votre séjour ? Écrivez-nous : la réponse arrivera par e-mail et ici.</p>
      ) : (
        <ul className="suivi-messages">
          {suivi.messages.map((m, i) => (
            <li key={i} className={m.auteur === 'CLIENT' ? 'suivi-message-client' : 'suivi-message-vanlife'}>
              <span className="suivi-message-auteur">
                {m.auteur === 'CLIENT' ? 'Vous' : `${m.signature} · Vanlife`} — {heure(m.le)}
              </span>
              <p>{m.texte}</p>
            </li>
          ))}
        </ul>
      )}
      {envoye && <p className="alerte alerte-info" role="status">Message envoyé. Vanlife vous répondra par e-mail.</p>}
      {mutation.isError && <p className="alerte alerte-erreur" role="alert">{mutation.error.message}</p>}
      <form onSubmit={(e) => { e.preventDefault(); setEnvoye(false); if (texte.trim()) mutation.mutate() }}>
        <div className="champ">
          <label htmlFor="suivi-message">Votre message</label>
          <textarea id="suivi-message" rows={4} maxLength={MESSAGE_SUIVI_LONGUEUR_MAX} value={texte} onChange={(e) => setTexte(e.target.value)} />
        </div>
        <Bouton type="submit" variante="secondaire" disabled={!texte.trim() || mutation.isPending}>
          {mutation.isPending ? 'Envoi…' : 'Envoyer le message'}
        </Bouton>
      </form>
    </section>
  )
}

function Annulation({ suivi, acces }: { suivi: SuiviDemande; acces: AccesSuivi }) {
  const client = useQueryClient()
  const [confirmation, setConfirmation] = useState(false)
  const [motif, setMotif] = useState('')
  const refMotif = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (confirmation) refMotif.current?.focus() }, [confirmation])
  const mutation = useMutation({
    mutationFn: () => annulerDemande(acces, motif),
    onSuccess: (maj) => client.setQueryData(cleSuivi(acces), maj),
  })

  if (suivi.statut === 'CONFIRMEE') {
    return (
      <p className="suivi-discret">
        Votre séjour est confirmé. Pour le modifier ou l'annuler, écrivez à Vanlife ci-dessus.
      </p>
    )
  }
  if (!suivi.peutAnnuler) return null

  return (
    <section className="carte suivi-carte" aria-labelledby="titre-annuler">
      <h2 id="titre-annuler" className="h3">Annuler ma demande</h2>
      {mutation.isError && <p className="alerte alerte-erreur" role="alert">{mutation.error.message}</p>}
      {!confirmation ? (
        <>
          <p>Vous pouvez annuler gratuitement tant que Vanlife n'a pas confirmé votre séjour.</p>
          <Bouton variante="secondaire" onClick={() => setConfirmation(true)}>Annuler ma demande</Bouton>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <p><strong>Confirmez-vous l'annulation de la demande {suivi.reference} ?</strong> Le van sera proposé à d'autres voyageurs.</p>
          <div className="champ">
            <label htmlFor="suivi-motif">Motif (facultatif)</label>
            <textarea id="suivi-motif" ref={refMotif} rows={2} maxLength={MOTIF_ANNULATION_LONGUEUR_MAX} value={motif}
              onChange={(e) => setMotif(e.target.value)} />
          </div>
          <div className="actions">
            <Bouton variante="secondaire" onClick={() => setConfirmation(false)} disabled={mutation.isPending}>Garder ma demande</Bouton>
            <Bouton type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Annulation…' : "Confirmer l'annulation"}</Bouton>
          </div>
        </form>
      )}
    </section>
  )
}

function Demande({ acces }: { acces: AccesSuivi }) {
  const requete = useQuery({ queryKey: cleSuivi(acces), queryFn: () => lireSuivi(acces), retry: false })
  const refTitre = useRef<HTMLHeadingElement>(null)
  const pret = requete.data !== undefined
  useEffect(() => { if (pret) refTitre.current?.focus({ preventScroll: true }) }, [pret])

  if (requete.isPending) return <ChargementDonnees texte="Chargement de votre demande…" />
  if (requete.isError) {
    return (
      <ErreurDonnees titre="Votre demande ne peut pas être affichée pour le moment." erreur={requete.error}
        enCours={requete.isFetching} onReessayer={() => void requete.refetch()} />
    )
  }
  const suivi = requete.data
  if (!suivi) {
    return (
      <>
        <h1 ref={refTitre} tabIndex={-1}>Lien de suivi expiré ou incorrect</h1>
        <div className="alerte alerte-erreur" role="alert">
          Ce lien ne permet pas d'afficher la demande : il est peut-être incomplet (copié en partie) ou a expiré.
        </div>
        <DemanderLien referenceInitiale={acces.reference} intro="Recevez un nouveau lien à l'adresse e-mail de votre demande." />
      </>
    )
  }

  return (
    <>
      <p className="surtitre-section">Votre espace · demande {suivi.reference}</p>
      <h1 ref={refTitre} tabIndex={-1}>Bonjour {suivi.voyageur.prenom}</h1>
      <Etapes suivi={suivi} />

      <div className="suivi-grille">
        <section className="carte suivi-carte" aria-labelledby="titre-recap">
          <h2 id="titre-recap" className="h3">Votre demande</h2>
          <ListeRecap lignes={[
            { libelle: 'Référence', valeur: suivi.reference },
            { libelle: 'Circuit', valeur: suivi.sejour.nom },
            { libelle: 'Départ', valeur: `${formaterDateFr(suivi.dateDepart)} — ${suivi.sejour.villeDepart}` },
            { libelle: 'Retour', valeur: `${formaterDateFr(suivi.dateRetour)} — ${suivi.sejour.villeRetour}` },
            { libelle: 'Voyageurs', valeur: `${suivi.nombreVoyageurs} personnes` },
            { libelle: 'Prix indicatif', valeur: <>{formaterPrix(suivi.prixIndicatif)} <Badge>à confirmer</Badge></> },
            { libelle: 'E-mail', valeur: suivi.voyageur.email, cesure: true },
          ]} />
        </section>
        <div>
          <Messages suivi={suivi} acces={acces} />
          <Annulation suivi={suivi} acces={acces} />
        </div>
      </div>
      <p className="suivi-discret">
        Ce lien est personnel : ne le partagez pas. Vous pouvez en recevoir un nouveau à tout moment depuis
        la page <a href={ROUTE_SUIVI}>Suivre ma demande</a>.
      </p>
    </>
  )
}

export default function SuiviPage({ chemin }: { chemin: string }) {
  const acces = lireAcces(chemin)
  return (
    <>
      <Header liens={LIENS_PRINCIPAUX} lienLogo={ROUTE_ACCUEIL} />
      <main id="contenu" tabIndex={-1} className="page-entree section suivi">
        <div className="conteneur suivi-conteneur">
          {acces ? (
            <Demande key={`${acces.reference}/${acces.jeton}`} acces={acces} />
          ) : (
            <>
              <h1>Suivre ma demande</h1>
              <p className="accroche">
                Le lien de suivi se trouve dans l'e-mail reçu après votre demande. Vous l'avez perdu ? Recevez-en un nouveau.
              </p>
              <DemanderLien intro="Pour votre sécurité, le lien est envoyé uniquement à l'adresse e-mail de la demande." />
              <p className="suivi-discret">Pas encore de demande ? <LienBouton variante="secondaire" href={ROUTE_DEMANDE}>Faire une demande</LienBouton></p>
            </>
          )}
        </div>
      </main>
    </>
  )
}
