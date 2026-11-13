import type { FormEvent, Ref } from 'react'
import type { ChampDemande, DemandeSaisie, DepartDisponible, ErreursDemande } from '../../domain/types'
import { PRENOM_LONGUEUR_MAX } from '../../domain/validation'
import ChampFormulaire from '../ui/ChampFormulaire'
import ChampListe from '../ui/ChampListe'
import { Bouton } from '../ui/Bouton'
import ResumeErreurs from './ResumeErreurs'
import { ID_CHAMP, LIBELLES_CHAMPS } from './champs'
import { groupesDeparts } from './optionsDeparts'

export interface FormulaireDemandeProps {
  saisie: DemandeSaisie
  erreurs: ErreursDemande
  /** Départs proposés par le serveur (date, places restantes). */
  departs: DepartDisponible[]
  onChangement: (champ: ChampDemande, valeur: string) => void
  /** Sortie d'un champ (permet une validation au fil de la saisie). */
  onSortieChamp?: (champ: ChampDemande) => void
  onValider: () => void
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
  saisie, erreurs, departs, onChangement, onSortieChamp, onValider, aideDate,
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
      <ChampListe
        id={ID_CHAMP.dateDepart}
        libelle={LIBELLES_CHAMPS.dateDepart}
        valeur={saisie.dateDepart}
        onValeur={(v) => onChangement('dateDepart', v)}
        onBlur={() => onSortieChamp?.('dateDepart')}
        erreur={erreurs.dateDepart}
        aide={aideDate}
        invite="Choisissez un départ"
        groupes={groupesDeparts(departs)}
      />

      <Bouton type="submit" pleineLargeur>{libelleBouton}</Bouton>
    </form>
  )
}
