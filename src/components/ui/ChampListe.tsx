export interface OptionListe {
  valeur: string
  libelle: string
  desactivee?: boolean
}

export interface GroupeOptions {
  libelle: string
  options: OptionListe[]
}

interface ChampListeProps {
  id: string
  libelle: string
  valeur: string
  onValeur: (valeur: string) => void
  onBlur?: () => void
  /** Options regroupées (ex. par mois), affichées avec <optgroup>. */
  groupes: GroupeOptions[]
  /** Première ligne, sans valeur, tant que rien n'est choisi. */
  invite: string
  aide?: string
  erreur?: string
}

/**
 * Liste déroulante accessible : mêmes règles que ChampFormulaire (libellé associé,
 * aide et erreur reliées par aria-describedby, aria-invalid en cas d'erreur).
 */
export default function ChampListe({
  id, libelle, valeur, onValeur, onBlur, groupes, invite, aide, erreur,
}: ChampListeProps) {
  const idAide = aide ? `${id}-aide` : undefined
  const idErreur = erreur ? `${id}-erreur` : undefined
  const decrit = [idAide, idErreur].filter(Boolean).join(' ') || undefined

  return (
    <div className={`champ${erreur ? ' champ-erreur' : ''}`}>
      <label htmlFor={id}>{libelle}</label>
      {aide && <p id={idAide} className="aide">{aide}</p>}
      <select
        id={id}
        value={valeur}
        onChange={(e) => onValeur(e.target.value)}
        onBlur={onBlur}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decrit}
      >
        <option value="">{invite}</option>
        {groupes.map((g) => (
          <optgroup key={g.libelle} label={g.libelle}>
            {g.options.map((o) => (
              <option key={o.valeur} value={o.valeur} disabled={o.desactivee}>{o.libelle}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {erreur && <p id={idErreur} className="msg-erreur">{erreur}</p>}
    </div>
  )
}
