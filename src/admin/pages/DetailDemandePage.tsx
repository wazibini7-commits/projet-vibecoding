import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, clesAdmin } from '../api'
import { PastilleStatut, Retour } from '../composants'
import { formaterDateHeure } from '../format'
import { Bouton } from '../../components/ui/Bouton'
import { ChargementDonnees, ErreurDonnees } from '../../components/ui/EtatDonnees'
import {
  COMMENTAIRE_LONGUEUR_MAX, LIBELLES_STATUT, LIBELLES_STATUT_EMAIL, LIBELLES_TYPE_EMAIL, NOTE_LONGUEUR_MAX,
  type DetailDemande,
} from '../../domain/admin'
import type { StatutDemande } from '../../domain/types'
import { MESSAGE_SUIVI_LONGUEUR_MAX } from '../../domain/suivi'
import { formaterDateFr } from '../../utils/dates'
import { formaterPrix } from '../../utils/format'
import { ROUTE_ADMIN } from '../../utils/navigation'

/** Action proposée pour chaque statut cible (libellé du choix). */
const ACTIONS: Record<StatutDemande, string> = {
  RECUE: 'Reçue',
  EN_ETUDE: 'Passer en étude',
  CONFIRMEE: 'Confirmer la réservation',
  REFUSEE: 'Refuser la demande',
  ANNULEE: 'Annuler la demande',
}

function ChangerStatut({ demande }: { demande: DetailDemande }) {
  const client = useQueryClient()
  const [statut, setStatut] = useState<StatutDemande | ''>('')
  const [commentaire, setCommentaire] = useState('')
  const [informerClient, setInformerClient] = useState(true)
  const [succes, setSucces] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.changerStatut(demande.reference, { statut: statut as StatutDemande, commentaire, informerClient }),
    onSuccess: (maj) => {
      client.setQueryData(clesAdmin.demande(demande.reference), maj)
      void client.invalidateQueries({ queryKey: clesAdmin.toutesDemandes })
      void client.invalidateQueries({ queryKey: ['admin', 'departs'] })
      setSucces(`Statut modifié : ${LIBELLES_STATUT[maj.statut]}.${informerClient ? ` Un e-mail est envoyé à ${maj.client.email}.` : ''}`)
      setStatut('')
      setCommentaire('')
    },
  })

  if (demande.transitionsPossibles.length === 0) {
    return (
      <section className="carte admin-carte" aria-labelledby="titre-statut">
        <h2 id="titre-statut" className="h3">Statut</h2>
        {succes && <Retour type="succes">{succes}</Retour>}
        <p>Cette demande est close ({LIBELLES_STATUT[demande.statut].toLowerCase()}) : son statut ne peut plus changer.</p>
      </section>
    )
  }

  function valider(e: FormEvent) {
    e.preventDefault()
    setSucces(null)
    if (statut) mutation.mutate()
  }

  return (
    <section className="carte admin-carte" aria-labelledby="titre-statut">
      <h2 id="titre-statut" className="h3">Changer le statut</h2>
      {succes && <Retour type="succes">{succes}</Retour>}
      {mutation.isError && <Retour type="erreur">{mutation.error.message}</Retour>}
      <form onSubmit={valider} noValidate>
        <fieldset className="admin-choix">
          <legend>Nouveau statut</legend>
          {demande.transitionsPossibles.map((s) => (
            <label key={s} className="admin-radio">
              <input type="radio" name="statut" value={s} checked={statut === s} onChange={() => setStatut(s)} />
              {ACTIONS[s]}
            </label>
          ))}
        </fieldset>
        <div className="champ">
          <label htmlFor="admin-commentaire">Commentaire (facultatif)</label>
          <p id="admin-commentaire-aide" className="aide">
            Conservé dans l'historique{informerClient ? ', et inclus dans l’e-mail envoyé au client' : ''}.
          </p>
          <textarea
            id="admin-commentaire" rows={3} maxLength={COMMENTAIRE_LONGUEUR_MAX} value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)} aria-describedby="admin-commentaire-aide"
          />
        </div>
        <label className="admin-case">
          <input type="checkbox" checked={informerClient} onChange={(e) => setInformerClient(e.target.checked)} />
          Informer le client par e-mail ({demande.client.email})
        </label>
        <Bouton type="submit" disabled={!statut || mutation.isPending}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer le changement'}
        </Bouton>
      </form>
    </section>
  )
}

function Echange({ demande }: { demande: DetailDemande }) {
  const client = useQueryClient()
  const [texte, setTexte] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const mutation = useMutation({
    mutationFn: () => api.repondre(demande.reference, texte),
    onSuccess: (maj) => {
      client.setQueryData(clesAdmin.demande(demande.reference), maj)
      setTexte('')
      setEnvoye(true)
    },
  })
  return (
    <section className="carte admin-carte" aria-labelledby="titre-echange">
      <h2 id="titre-echange" className="h3">Échange avec le client</h2>
      {demande.messages.length === 0 ? (
        <p className="admin-secondaire">Aucun message pour le moment.</p>
      ) : (
        <ul className="admin-echange">
          {demande.messages.map((m, i) => (
            <li key={i} className={m.auteur === 'CLIENT' ? 'admin-message-client' : 'admin-message-vanlife'}>
              <span className="admin-secondaire">
                {m.auteur === 'CLIENT' ? demande.client.prenom : m.nom ?? 'Vanlife (compte supprimé)'} — {formaterDateHeure(m.le)}
              </span>
              <p>{m.texte}</p>
            </li>
          ))}
        </ul>
      )}
      {envoye && <Retour type="succes">Réponse envoyée par e-mail à {demande.client.email}.</Retour>}
      {mutation.isError && <Retour type="erreur">{mutation.error.message}</Retour>}
      <form onSubmit={(e) => { e.preventDefault(); setEnvoye(false); if (texte.trim()) mutation.mutate() }}>
        <div className="champ">
          <label htmlFor="admin-reponse">Répondre au client</label>
          <p id="admin-reponse-aide" className="aide">Envoyé par e-mail, signé de votre prénom, et visible dans son espace de suivi.</p>
          <textarea id="admin-reponse" rows={3} maxLength={MESSAGE_SUIVI_LONGUEUR_MAX} value={texte}
            onChange={(e) => setTexte(e.target.value)} aria-describedby="admin-reponse-aide" />
        </div>
        <Bouton type="submit" variante="secondaire" disabled={!texte.trim() || mutation.isPending}>
          {mutation.isPending ? 'Envoi…' : 'Envoyer la réponse'}
        </Bouton>
      </form>
    </section>
  )
}

function NoteInterne({ demande }: { demande: DetailDemande }) {
  const client = useQueryClient()
  const [note, setNote] = useState(demande.noteInterne ?? '')
  const [enregistree, setEnregistree] = useState(false)
  useEffect(() => setNote(demande.noteInterne ?? ''), [demande.noteInterne])
  const mutation = useMutation({
    mutationFn: () => api.modifierNote(demande.reference, note),
    onSuccess: (maj) => {
      client.setQueryData(clesAdmin.demande(demande.reference), maj)
      setEnregistree(true)
    },
  })
  return (
    <section className="carte admin-carte" aria-labelledby="titre-note">
      <h2 id="titre-note" className="h3">Note interne</h2>
      {enregistree && <Retour type="succes">Note enregistrée.</Retour>}
      {mutation.isError && <Retour type="erreur">{mutation.error.message}</Retour>}
      <form onSubmit={(e) => { e.preventDefault(); setEnregistree(false); mutation.mutate() }}>
        <div className="champ">
          <label htmlFor="admin-note">Note (visible uniquement par l'équipe Vanlife)</label>
          <textarea id="admin-note" rows={3} maxLength={NOTE_LONGUEUR_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Bouton type="submit" variante="secondaire" disabled={mutation.isPending}>Enregistrer la note</Bouton>
      </form>
    </section>
  )
}

export default function DetailDemandePage({ reference }: { reference: string }) {
  const requete = useQuery({ queryKey: clesAdmin.demande(reference), queryFn: () => api.demande(reference) })
  const d = requete.data

  if (requete.isPending) return <ChargementDonnees texte="Chargement de la demande…" />
  if (!d) {
    return (
      <>
        <a className="lien-retour" href={ROUTE_ADMIN}>← Toutes les demandes</a>
        <ErreurDonnees titre="Impossible d'afficher cette demande." erreur={requete.error} enCours={requete.isFetching} onReessayer={() => void requete.refetch()} />
      </>
    )
  }

  return (
    <>
      <a className="lien-retour" href={ROUTE_ADMIN}>← Toutes les demandes</a>
      <div className="admin-titre-ligne">
        <h1>Demande {d.reference}</h1>
        <PastilleStatut statut={d.statut} />
      </div>
      <p className="admin-aide">Reçue le {formaterDateHeure(d.creeLe)}</p>

      <div className="admin-grille">
        <div className="admin-colonne">
          <section className="carte admin-carte" aria-labelledby="titre-sejour">
            <h2 id="titre-sejour" className="h3">Séjour</h2>
            <dl className="admin-infos">
              <dt>Circuit</dt><dd>{d.sejour.nom}</dd>
              <dt>Départ</dt><dd>{formaterDateFr(d.dateDepart)}</dd>
              <dt>Retour</dt><dd>{formaterDateFr(d.dateRetour)}</dd>
              <dt>Voyageurs</dt><dd>{d.nombreVoyageurs} personnes</dd>
              <dt>Prix indicatif</dt><dd>{formaterPrix(d.prixIndicatif)} (au moment de la demande)</dd>
            </dl>
          </section>
          <section className="carte admin-carte" aria-labelledby="titre-client">
            <h2 id="titre-client" className="h3">Client</h2>
            <dl className="admin-infos">
              <dt>Nom</dt><dd>{d.client.prenom}{d.client.nom ? ` ${d.client.nom}` : ''}</dd>
              <dt>E-mail</dt><dd><a href={`mailto:${d.client.email}?subject=${encodeURIComponent(`Votre demande ${d.reference}`)}`}>{d.client.email}</a></dd>
              {d.client.telephone && <><dt>Téléphone</dt><dd><a href={`tel:${d.client.telephone}`}>{d.client.telephone}</a></dd></>}
              <dt>Message</dt><dd className="admin-message">{d.message ?? <span className="admin-secondaire">Aucun message</span>}</dd>
            </dl>
          </section>
          <section className="carte admin-carte" aria-labelledby="titre-historique">
            <h2 id="titre-historique" className="h3">Historique</h2>
            <ol className="admin-historique">
              {d.historique.map((h, i) => (
                <li key={i}>
                  <strong>{h.ancienStatut ? `${LIBELLES_STATUT[h.ancienStatut]} → ${LIBELLES_STATUT[h.nouveauStatut]}` : 'Demande reçue'}</strong>
                  <span className="admin-secondaire">{formaterDateHeure(h.le)} · {h.auteur ?? (h.ancienStatut ? 'compte supprimé' : 'client')}</span>
                  {h.commentaire && <p>« {h.commentaire} »</p>}
                </li>
              ))}
            </ol>
          </section>
          <section className="carte admin-carte" aria-labelledby="titre-emails">
            <h2 id="titre-emails" className="h3">E-mails</h2>
            <ul className="admin-emails">
              {d.emails.map((e, i) => (
                <li key={i}>
                  <span><strong>{LIBELLES_TYPE_EMAIL[e.type]}</strong> à {e.destinataire}</span>
                  <span className={`admin-email-statut admin-email-${e.statut.toLowerCase()}`}>
                    {LIBELLES_STATUT_EMAIL[e.statut]}
                    {e.envoyeLe ? ` le ${formaterDateHeure(e.envoyeLe)}` : ''}
                    {e.statut !== 'ENVOYE' && e.tentatives > 0 ? ` (${e.tentatives} essai${e.tentatives > 1 ? 's' : ''})` : ''}
                  </span>
                  {e.derniereErreur && e.statut !== 'ENVOYE' && <span className="admin-secondaire">Erreur : {e.derniereErreur}</span>}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="admin-colonne">
          <ChangerStatut demande={d} />
          <Echange demande={d} />
          <NoteInterne demande={d} />
          <p className="admin-aide">
            Une demande refusée ou annulée libère sa place sur le départ.
          </p>
        </div>
      </div>
    </>
  )
}
