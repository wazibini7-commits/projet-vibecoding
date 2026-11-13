import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, ErreurAdmin } from '../api'
import { Retour } from '../composants'
import ChampFormulaire from '../../components/ui/ChampFormulaire'
import { Bouton } from '../../components/ui/Bouton'
import { LIBELLES_ROLE, MOT_DE_PASSE_LONGUEUR_MIN, type UtilisateurConnecte } from '../../domain/admin'

export default function ComptePage({ utilisateur }: { utilisateur: UtilisateurConnecte }) {
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [succes, setSucces] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.changerMotDePasse(actuel, nouveau),
    onSuccess: () => {
      setSucces(true)
      setActuel(''); setNouveau(''); setConfirmation('')
    },
    onError: (e) => setErreurs(e instanceof ErreurAdmin && e.erreurs ? e.erreurs : {}),
  })

  function valider(e: FormEvent) {
    e.preventDefault()
    setSucces(false)
    const locales: Record<string, string> = {}
    if (!actuel) locales.actuel = 'Indiquez votre mot de passe actuel.'
    if (nouveau.length < MOT_DE_PASSE_LONGUEUR_MIN) locales.nouveau = `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_LONGUEUR_MIN} caractères.`
    if (confirmation !== nouveau) locales.confirmation = 'Les deux mots de passe ne sont pas identiques.'
    setErreurs(locales)
    if (Object.keys(locales).length === 0) mutation.mutate()
  }

  return (
    <>
      <h1>Mon compte</h1>
      <section className="carte admin-carte" aria-labelledby="titre-profil">
        <h2 id="titre-profil" className="h3">Profil</h2>
        <dl className="admin-infos">
          <dt>Nom</dt><dd>{utilisateur.nom}</dd>
          <dt>E-mail</dt><dd>{utilisateur.email}</dd>
          <dt>Rôle</dt><dd>{LIBELLES_ROLE[utilisateur.role]}</dd>
        </dl>
      </section>
      <section className="carte admin-carte" aria-labelledby="titre-mdp">
        <h2 id="titre-mdp" className="h3">Changer de mot de passe</h2>
        {succes && <Retour type="succes">Mot de passe modifié. Vos autres appareils ont été déconnectés.</Retour>}
        {mutation.isError && !Object.keys(erreurs).length && <Retour type="erreur">{mutation.error.message}</Retour>}
        <form onSubmit={valider} noValidate>
          <ChampFormulaire id="mdp-actuel" type="password" libelle="Mot de passe actuel" valeur={actuel} onValeur={setActuel}
            erreur={erreurs.actuel} autoComplete="current-password" />
          <ChampFormulaire id="mdp-nouveau" type="password" libelle="Nouveau mot de passe" valeur={nouveau} onValeur={setNouveau}
            erreur={erreurs.nouveau} autoComplete="new-password"
            aide={`Au moins ${MOT_DE_PASSE_LONGUEUR_MIN} caractères. Une phrase de plusieurs mots est facile à retenir et solide.`} />
          <ChampFormulaire id="mdp-confirmation" type="password" libelle="Confirmez le nouveau mot de passe" valeur={confirmation}
            onValeur={setConfirmation} erreur={erreurs.confirmation} autoComplete="new-password" />
          <Bouton type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Enregistrement…' : 'Changer le mot de passe'}</Bouton>
        </form>
      </section>
    </>
  )
}
