import { forwardRef } from 'react'
import type { ChampDemande, ErreursDemande } from '../../domain/types'
import { ID_CHAMP, LIBELLES_CHAMPS } from './champs'

/**
 * Résumé des erreurs en tête de formulaire ; chaque erreur renvoie au champ concerné.
 * Focalisable (ref) pour y amener le visiteur après une tentative d'envoi.
 */
const ResumeErreurs = forwardRef<HTMLDivElement, { erreurs: ErreursDemande }>(function ResumeErreurs({ erreurs }, ref) {
  const champs = Object.keys(erreurs) as ChampDemande[]
  if (champs.length === 0) return null
  return (
    <div ref={ref} className="alerte alerte-erreur" role="alert" tabIndex={-1}>
      <p><strong>Merci de corriger {champs.length > 1 ? 'les champs suivants' : 'le champ suivant'} :</strong></p>
      <ul>
        {champs.map((c) => (
          <li key={c}>
            <a href={`#${ID_CHAMP[c]}`}>{LIBELLES_CHAMPS[c]} — {erreurs[c]}</a>
          </li>
        ))}
      </ul>
    </div>
  )
})

export default ResumeErreurs
