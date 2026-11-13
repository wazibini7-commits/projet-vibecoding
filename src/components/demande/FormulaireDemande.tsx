import type { FormEvent, Ref } from 'react'
import type { ChampDemande, DemandeSaisie, ErreursDemande } from '../../domain/types'
import { PRENOM_LONGUEUR_MAX } from '../../domain/validation'
import ChampFormulaire from '../ui/ChampFormulaire'
import { Bouton } from '../ui/Bouton'
import ResumeErreurs from './ResumeErreurs'
import { ID_CHAMP, LIBELLES_CHAMPS } from './champs'

export interface FormulaireDemandeProps {
  saisie: DemandeSaisie
  erreurs: ErreursDemande
  onChangement: (champ: ChampDemande, valeur: string) => void
  /** Sortie d'un champ (permet une validation au fil de la saisie). */
  onSortieChamp?: (champ: ChampDemande) => void
  onValider: () => void
  /** Date minimale proposée par le calendrier (AAAA-MM-JJ). */
  dateMin?: string
  /** Rappel du trajet sous le champ date, ex. « Départ de Rennes, retour 4 jours plus tard. » */
  aideDate?: string
  libelleBouton?: string
  refResumeErreurs?: Ref<HTMLDivElement>
}

/**
 * Formulaire de demande « contrôlé » : il affiche les valeurs et erreurs reçues
 * et remonte les actions. La validation est faite par le domaine, pas ici.
 * noValidate : on remplace les bulles natives par nos messages explicites.
 */
export default function FormulaireDemande({
  saisie, erreurs, onChangement, onSortieChamp, onValider, dateMin, aideDate,
  libelleBouton = 'Vérifier ma demande', refResumeErreurs,
}: FormulaireDemandeProps) {
  function soumettre(e: FormEvent) {
    e.preventDefault()
    onValider()
  }

  return (
    <form className="carte formulaire" noValidate onSubmit={soumettre}>
      <ResumeErreurs ref={refResumeErreurs} erreurs={erreurs} />
      <p className="champs-obligatoires">Tous les champs sont obligatoires.</p>

      <ChampFormulaire
        id={ID_CHAMP.prenom}
        libelle={LIBELLES_CHAMPS.prenom}
        valeur={saisie.prenom}
        onValeur={(v) => onChangement('prenom', v)}
        onBlur={() => onSortieChamp?.('prenom')}
        erreur={erreurs.prenom}
        autoComplete="given-name"
        maxLength={PRENOM_LONGUEUR_MAX}
        placeholder="Ex. : Camille"
      />
      <ChampFormulaire
        id={ID_CHAMP.email}
        type="email"
        libelle={LIBELLES_CHAMPS.email}
        valeur={saisie.email}
        onValeur={(v) => onChangement('email', v)}
        onBlur={() => onSortieChamp?.('email')}
        erreur={erreurs.email}
        autoComplete="email"
        inputMode="email"
        placeholder="Ex. : camille@exemple.fr"
      />
      <ChampFormulaire
        id={ID_CHAMP.dateDepart}
        type="date"
        libelle={LIBELLES_CHAMPS.dateDepart}
        valeur={saisie.dateDepart}
        onValeur={(v) => onChangement('dateDepart', v)}
        onBlur={() => onSortieChamp?.('dateDepart')}
        erreur={erreurs.dateDepart}
        aide={aideDate}
        min={dateMin}
      />

      <Bouton type="submit" pleineLargeur>{libelleBouton}</Bouton>
    </form>
  )
}
