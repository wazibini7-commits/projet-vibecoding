import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, clesAdmin } from '../api'
import { Retour } from '../composants'
import ChampFormulaire from '../../components/ui/ChampFormulaire'
import { Bouton } from '../../components/ui/Bouton'
import { ChargementDonnees, ErreurDonnees } from '../../components/ui/EtatDonnees'
import { ID_SEJOUR_PILOTE } from '../../data/sejour'
import { LIBELLES_STATUT_DEPART, type DepartAdmin, type StatutDepartAdmin, type UtilisateurConnecte } from '../../domain/admin'
import { aujourdhuiIso, formaterDateFr } from '../../utils/dates'
import { cles } from '../../api/requetes'

function LigneDepart({ depart, modifiable, passe }: { depart: DepartAdmin; modifiable: boolean; passe: boolean }) {
  const client = useQueryClient()
  const [capacite, setCapacite] = useState(String(depart.capacite))
  const mutation = useMutation({
    mutationFn: (modif: { capacite?: number; statut?: StatutDepartAdmin }) => api.modifierDepart(depart.id, modif),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: clesAdmin.departs(ID_SEJOUR_PILOTE) })
      void client.invalidateQueries({ queryKey: cles.departs(ID_SEJOUR_PILOTE) }) // liste du site public
    },
  })
  const libelleDate = formaterDateFr(depart.date)
  const plein = depart.demandesActives >= depart.capacite

  return (
    <tr className={passe ? 'admin-ligne-passee' : undefined}>
      <th scope="row" data-libelle="Date">{libelleDate}</th>
      <td data-libelle="Remplissage">
        <span className={plein ? 'admin-plein' : undefined}>{depart.demandesActives} / {depart.capacite} vans</span>
        <span className="admin-secondaire">{depart.demandesConfirmees} confirmée{depart.demandesConfirmees > 1 ? 's' : ''}</span>
      </td>
      <td data-libelle="Statut">
        {modifiable && !passe ? (
          <select
            aria-label={`Statut du départ du ${libelleDate}`}
            value={depart.statut}
            disabled={mutation.isPending}
            onChange={(e) => mutation.mutate({ statut: e.target.value as StatutDepartAdmin })}
          >
            {(Object.keys(LIBELLES_STATUT_DEPART) as StatutDepartAdmin[]).map((s) => (
              <option key={s} value={s}>{LIBELLES_STATUT_DEPART[s]}</option>
            ))}
          </select>
        ) : LIBELLES_STATUT_DEPART[depart.statut]}
      </td>
      <td data-libelle="Capacité">
        {modifiable && !passe ? (
          <form className="admin-capacite" onSubmit={(e) => { e.preventDefault(); mutation.mutate({ capacite: Number(capacite) }) }}>
            <input
              type="number" min={1} max={20} value={capacite} onChange={(e) => setCapacite(e.target.value)}
              aria-label={`Nombre de vans pour le départ du ${libelleDate}`}
            />
            <Bouton type="submit" variante="secondaire" disabled={mutation.isPending || Number(capacite) === depart.capacite}>OK</Bouton>
          </form>
        ) : depart.capacite}
        {mutation.isError && <p className="msg-erreur" role="alert">{mutation.error.message}</p>}
      </td>
    </tr>
  )
}

function NouveauDepart() {
  const client = useQueryClient()
  const [date, setDate] = useState('')
  const [capacite, setCapacite] = useState('2')
  const [succes, setSucces] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => api.creerDepart({ sejourId: ID_SEJOUR_PILOTE, date, capacite: Number(capacite) }),
    onSuccess: (d) => {
      void client.invalidateQueries({ queryKey: clesAdmin.departs(ID_SEJOUR_PILOTE) })
      void client.invalidateQueries({ queryKey: cles.departs(ID_SEJOUR_PILOTE) })
      setSucces(`Départ du ${formaterDateFr(d.date)} ajouté : il est proposé sur le site.`)
      setDate('')
    },
  })
  function valider(e: FormEvent) {
    e.preventDefault()
    setSucces(null)
    mutation.mutate()
  }
  return (
    <section className="carte admin-carte" aria-labelledby="titre-nouveau-depart">
      <h2 id="titre-nouveau-depart" className="h3">Ajouter un départ</h2>
      {succes && <Retour type="succes">{succes}</Retour>}
      {mutation.isError && <Retour type="erreur">{mutation.error.message}</Retour>}
      <form className="admin-formulaire-ligne" onSubmit={valider} noValidate>
        <ChampFormulaire id="admin-nouvelle-date" type="date" libelle="Date de départ" valeur={date} onValeur={setDate} min={aujourdhuiIso()} />
        <ChampFormulaire id="admin-nouvelle-capacite" type="number" libelle="Nombre de vans" valeur={capacite} onValeur={setCapacite} min={1} max={20} />
        <Bouton type="submit" disabled={!date || mutation.isPending}>Ajouter</Bouton>
      </form>
    </section>
  )
}

export default function DepartsPage({ utilisateur }: { utilisateur: UtilisateurConnecte }) {
  const requete = useQuery({ queryKey: clesAdmin.departs(ID_SEJOUR_PILOTE), queryFn: () => api.departs(ID_SEJOUR_PILOTE) })
  const modifiable = utilisateur.role === 'ADMIN'
  const aujourdhui = aujourdhuiIso()

  return (
    <>
      <h1>Départs — Bretagne Sauvage</h1>
      <p className="admin-aide">
        Un départ « fermé » n'est plus proposé sur le site. « Complet (forcé) » le bloque même s'il reste des vans.
        Une demande reçue, en étude ou confirmée occupe un van.
      </p>
      {!modifiable && (
        <Retour type="succes">Consultation seule : seuls les administrateurs peuvent modifier les départs.</Retour>
      )}
      {modifiable && <NouveauDepart />}
      {requete.isPending ? (
        <ChargementDonnees texte="Chargement des départs…" />
      ) : !requete.data ? (
        <ErreurDonnees titre="Impossible d'afficher les départs." erreur={requete.error} enCours={requete.isFetching} onReessayer={() => void requete.refetch()} />
      ) : requete.data.length === 0 ? (
        <p className="admin-vide">Aucun départ programmé.</p>
      ) : (
        <table className="admin-tableau">
          <caption className="sr-only">Départs programmés, du plus proche au plus lointain</caption>
          <thead>
            <tr><th scope="col">Date</th><th scope="col">Remplissage</th><th scope="col">Statut</th><th scope="col">Capacité (vans)</th></tr>
          </thead>
          <tbody>
            {requete.data.map((d) => (
              <LigneDepart key={`${d.id}-${d.capacite}`} depart={d} modifiable={modifiable} passe={d.date <= aujourdhui} />
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
