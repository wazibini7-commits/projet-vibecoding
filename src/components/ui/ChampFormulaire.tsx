import type { InputHTMLAttributes } from 'react'

type AttributsNatifs = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange' | 'type'>

export interface ChampFormulaireProps extends AttributsNatifs {
  id: string
  libelle: string
  valeur: string
  onValeur: (valeur: string) => void
  type?: 'text' | 'email' | 'date' | 'password' | 'search' | 'number'
  /** Texte d'aide affiché sous le libellé. */
  aide?: string
  /** Message d'erreur explicite ; sa présence met le champ en état d'erreur. */
  erreur?: string
}

/**
 * Champ de saisie accessible : libellé associé, aide et erreur reliées par
 * aria-describedby, aria-invalid en cas d'erreur. Police 16 px (pas de zoom iOS).
 */
export default function ChampFormulaire({
  id, libelle, valeur, onValeur, type = 'text', aide, erreur, ...natifs
}: ChampFormulaireProps) {
  const idAide = aide ? `${id}-aide` : undefined
  const idErreur = erreur ? `${id}-erreur` : undefined
  const decrit = [idAide, idErreur].filter(Boolean).join(' ') || undefined

  return (
    <div className={`champ${erreur ? ' champ-erreur' : ''}`}>
      <label htmlFor={id}>{libelle}</label>
      {aide && <p id={idAide} className="aide">{aide}</p>}
      <input
        id={id}
        type={type}
        value={valeur}
        onChange={(e) => onValeur(e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decrit}
        {...natifs}
      />
      {erreur && <p id={idErreur} className="msg-erreur">{erreur}</p>}
    </div>
  )
}
