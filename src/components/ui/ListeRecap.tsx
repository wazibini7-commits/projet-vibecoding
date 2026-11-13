import type { ReactNode } from 'react'

export interface LigneRecap {
  libelle: string
  valeur: ReactNode
  /** Valeur longue sans espace (e-mail) : autorise la césure n'importe où. */
  cesure?: boolean
}

/** Liste « libellé / valeur » (récapitulatif, confirmation). Empilée sur mobile. */
export default function ListeRecap({ lignes }: { lignes: LigneRecap[] }) {
  return (
    <dl className="liste-recap">
      {lignes.map((l) => (
        <div key={l.libelle}>
          <dt>{l.libelle}</dt>
          <dd className={l.cesure ? 'cesure' : undefined}>{l.valeur}</dd>
        </div>
      ))}
    </dl>
  )
}
