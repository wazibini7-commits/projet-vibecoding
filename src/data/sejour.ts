// Contenu du circuit pilote. Depuis l'étape 3, le site l'affiche via l'API (base de données) ;
// ce fichier reste la SOURCE du remplissage de la base (backend/prisma/seed.ts → npm run db:seed)
// et sert de jeu de données aux tests.
// Source : brief client et cahier des charges v1.0 (§ 7.1 à 7.3).
// Ce sont des HYPOTHÈSES de travail à valider par Vanlife avant toute commercialisation.
import type { Sejour } from '../domain/types'

/** Mention obligatoire, au mot près (cahier des charges § 9.3). */
export const MENTION_DEMO = 'Version de démonstration — offre et disponibilités à confirmer'

/** Identifiant du séjour présenté sur le site (adresse /api/sejours/:id). */
export const ID_SEJOUR_PILOTE = 'bretagne-sauvage'

export const SEJOUR_BRETAGNE_SAUVAGE: Sejour = {
  id: ID_SEJOUR_PILOTE,
  nom: 'Bretagne Sauvage',
  accroche: "Cinq jours en van aménagé entre presqu'île de Crozon et mer d'Iroise.",
  destination: "Finistère — presqu'île de Crozon et mer d'Iroise",
  duree: { jours: 5, nuits: 4 },
  public: 'Couples',
  nombreVoyageurs: 2,
  villeDepart: 'Rennes',
  villeRetour: 'Rennes',
  programme: [
    { jour: 1, titre: 'Rennes → Crozon / Morgat', description: 'Installation et découverte.' },
    { jour: 2, titre: 'Camaret-sur-Mer et pointe de Pen-Hir', description: 'Port de Camaret-sur-Mer et falaises de la pointe de Pen-Hir.' },
    { jour: 3, titre: 'Morgat et cap de la Chèvre', description: 'Activité nautique envisagée.' },
    { jour: 4, titre: 'Pointe Saint-Mathieu', description: 'Nuit dans le secteur Iroise.' },
    { jour: 5, titre: 'Retour à Rennes', description: 'Restitution du van.' },
  ],
  prix: { montant: 1390, devise: 'EUR', pourPersonnes: 2, aConfirmer: true },
  prestationsIncluses: [
    'Le van aménagé',
    'Quatre nuitées',
    'Une activité nautique, sous réserve des conditions',
    "Un panier d'accueil",
  ],
  depensesAPrevoir: ['Carburant', 'Repas', 'Autres visites'],
  elementsAConfirmer: ['Partenaires', 'Tarifs', 'Nuitées', 'Disponibilités'],
}
