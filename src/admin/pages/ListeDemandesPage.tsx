import { useState, type FormEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, clesAdmin } from '../api'
import { PastilleStatut } from '../composants'
import { formaterDateCourte, formaterDateHeure } from '../format'
import ChampFormulaire from '../../components/ui/ChampFormulaire'
import { Bouton } from '../../components/ui/Bouton'
import { ChargementDonnees, ErreurDonnees } from '../../components/ui/EtatDonnees'
import { LIBELLES_STATUT, STATUTS, type FiltresDemandes } from '../../domain/admin'
import type { StatutDemande } from '../../domain/types'
import { ROUTE_ADMIN } from '../../utils/navigation'

export default function ListeDemandesPage() {
  const [filtres, setFiltres] = useState<FiltresDemandes>({ page: 1 })
  const [saisieRecherche, setSaisieRecherche] = useState('')
  const requete = useQuery({
    queryKey: clesAdmin.demandes(filtres),
    queryFn: () => api.demandes(filtres),
    placeholderData: keepPreviousData, // le tableau reste affiché pendant le changement de filtre
  })

  const choisirStatut = (statut?: StatutDemande) => setFiltres((f) => ({ ...f, statut, page: 1 }))
  function rechercher(e: FormEvent) {
    e.preventDefault()
    setFiltres((f) => ({ ...f, recherche: saisieRecherche.trim() || undefined, page: 1 }))
  }

  const donnees = requete.data
  const totalTous = donnees ? Object.values(donnees.compteurs).reduce((a, b) => a + b, 0) : 0
  const pages = donnees ? Math.max(1, Math.ceil(donnees.total / donnees.parPage)) : 1

  return (
    <>
      <div className="admin-titre-ligne">
        <h1>Demandes de réservation</h1>
        <a className="btn btn-secondaire" href={api.adresseExport(filtres)} download>Exporter (tableur)</a>
      </div>

      <div className="admin-filtres">
        <div className="admin-onglets" role="group" aria-label="Filtrer par statut">
          <button type="button" aria-pressed={!filtres.statut} onClick={() => choisirStatut(undefined)}>
            Toutes <span className="admin-compteur">{totalTous}</span>
          </button>
          {STATUTS.map((s) => (
            <button key={s} type="button" aria-pressed={filtres.statut === s} onClick={() => choisirStatut(s)}>
              {LIBELLES_STATUT[s]} <span className="admin-compteur">{donnees?.compteurs[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <form className="admin-recherche" role="search" onSubmit={rechercher}>
          <ChampFormulaire
            id="admin-recherche" type="search" libelle="Rechercher" valeur={saisieRecherche} onValeur={setSaisieRecherche}
            placeholder="Référence, prénom, nom ou e-mail"
          />
          <Bouton type="submit" variante="secondaire">Rechercher</Bouton>
        </form>
      </div>

      {requete.isPending ? (
        <ChargementDonnees texte="Chargement des demandes…" />
      ) : !donnees ? (
        <ErreurDonnees titre="Impossible d'afficher les demandes." erreur={requete.error} enCours={requete.isFetching} onReessayer={() => void requete.refetch()} />
      ) : donnees.demandes.length === 0 ? (
        <p className="admin-vide" role="status">Aucune demande ne correspond à ces critères.</p>
      ) : (
        <>
          <p className="admin-aide" role="status">
            {donnees.total} demande{donnees.total > 1 ? 's' : ''}
            {filtres.statut ? ` « ${LIBELLES_STATUT[filtres.statut]} »` : ''}
            {filtres.recherche ? ` pour « ${filtres.recherche} »` : ''}
          </p>
          <table className="admin-tableau">
            <caption className="sr-only">Demandes de réservation, les plus récentes d'abord</caption>
            <thead>
              <tr><th scope="col">Référence</th><th scope="col">Client</th><th scope="col">Départ</th><th scope="col">Reçue le</th><th scope="col">Statut</th></tr>
            </thead>
            <tbody>
              {donnees.demandes.map((d) => (
                <tr key={d.reference}>
                  <td data-libelle="Référence"><a href={`${ROUTE_ADMIN}/demandes/${encodeURIComponent(d.reference)}`}>{d.reference}</a></td>
                  <td data-libelle="Client">
                    {d.client.prenom}{d.client.nom ? ` ${d.client.nom}` : ''}
                    <span className="admin-secondaire">{d.client.email}</span>
                  </td>
                  <td data-libelle="Départ">{formaterDateCourte(d.dateDepart)}<span className="admin-secondaire">{d.sejourNom}</span></td>
                  <td data-libelle="Reçue le">{formaterDateHeure(d.creeLe)}</td>
                  <td data-libelle="Statut"><PastilleStatut statut={d.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <nav className="admin-pagination" aria-label="Pages">
              <Bouton variante="secondaire" disabled={donnees.page <= 1} onClick={() => setFiltres((f) => ({ ...f, page: donnees.page - 1 }))}>
                Précédente
              </Bouton>
              <span>Page {donnees.page} sur {pages}</span>
              <Bouton variante="secondaire" disabled={donnees.page >= pages} onClick={() => setFiltres((f) => ({ ...f, page: donnees.page + 1 }))}>
                Suivante
              </Bouton>
            </nav>
          )}
        </>
      )}
    </>
  )
}
