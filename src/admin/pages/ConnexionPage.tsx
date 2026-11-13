import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ErreurAdmin } from '../api'
import { Retour } from '../composants'
import ChampFormulaire from '../../components/ui/ChampFormulaire'
import { Bouton } from '../../components/ui/Bouton'
import type { UtilisateurConnecte } from '../../domain/admin'

export default function ConnexionPage({ onConnecte }: { onConnecte: (u: UtilisateurConnecte) => void }) {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const refTitre = useRef<HTMLHeadingElement>(null)
  const refErreur = useRef<HTMLDivElement>(null)

  useEffect(() => refTitre.current?.focus({ preventScroll: true }), [])
  useEffect(() => { if (erreur) refErreur.current?.focus() }, [erreur])

  async function connecter(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !motDePasse) {
      setErreur('Indiquez votre adresse e-mail et votre mot de passe.')
      return
    }
    setEnCours(true)
    setErreur(null)
    try {
      onConnecte(await api.connexion(email, motDePasse))
    } catch (err) {
      setMotDePasse('')
      setErreur(err instanceof ErreurAdmin && err.statut === 429
        ? 'Trop d’essais de connexion. Patientez une minute avant de réessayer.'
        : err instanceof Error ? err.message : 'Connexion impossible.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="admin-connexion">
      <h1 ref={refTitre} tabIndex={-1}>Connexion à l'administration</h1>
      <p className="admin-aide">Espace réservé à l'équipe Vanlife.</p>
      <form className="carte admin-carte" noValidate onSubmit={connecter}>
        {erreur && <div ref={refErreur} tabIndex={-1}><Retour type="erreur">{erreur}</Retour></div>}
        <ChampFormulaire id="admin-email" type="email" libelle="Adresse e-mail" valeur={email} onValeur={setEmail} autoComplete="username" />
        <ChampFormulaire
          id="admin-mot-de-passe" type="password" libelle="Mot de passe" valeur={motDePasse} onValeur={setMotDePasse}
          autoComplete="current-password"
        />
        <Bouton type="submit" pleineLargeur disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</Bouton>
      </form>
    </div>
  )
}
