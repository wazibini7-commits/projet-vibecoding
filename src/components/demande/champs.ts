import type { ChampDemande } from '../../domain/types'

/** Libellés affichés pour chaque champ (formulaire et résumé d'erreurs). */
export const LIBELLES_CHAMPS: Record<ChampDemande, string> = {
  prenom: 'Prénom',
  email: 'Adresse e-mail',
  dateDepart: 'Date de départ souhaitée',
}

/** Identifiants HTML des champs (ancres du résumé d'erreurs). */
export const ID_CHAMP: Record<ChampDemande, string> = {
  prenom: 'champ-prenom',
  email: 'champ-email',
  dateDepart: 'champ-date-depart',
}
