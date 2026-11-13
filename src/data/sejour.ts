// Contenu du circuit pilote. Depuis l'étape 3, le site l'affiche via l'API (base de données) ;
// ce fichier reste la SOURCE du remplissage de la base (backend/prisma/seed.ts → npm run db:seed)
// et sert de jeu de données aux tests.
// Source : brief client et cahier des charges v1.0 (§ 7.1 à 7.3) pour les titres, descriptions, prix et prestations.
// Ajouts (programme détaillé, FAQ, fiche du van) : rédigés pour le prototype.
//   - distances et temps de route : estimations par la route, hors arrêts ;
//   - lieux de nuit, caution, animaux, équipement : HYPOTHÈSES marquées « à confirmer ».
// L'ensemble est à valider par Vanlife avant toute commercialisation.
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
    {
      jour: 1,
      titre: 'Rennes → Crozon / Morgat',
      description: 'Installation et découverte.',
      route: { distanceKm: 235, dureeMinutes: 170 },
      nuit: { lieu: 'Secteur Crozon – Morgat', aConfirmer: true },
      activites: [
        'Remise des clés et prise en main du van à Rennes',
        'Route vers le Finistère par la voie express',
        'Installation et première balade sur le port et la plage de Morgat',
      ],
    },
    {
      jour: 2,
      titre: 'Camaret-sur-Mer et pointe de Pen-Hir',
      description: 'Port de Camaret-sur-Mer et falaises de la pointe de Pen-Hir.',
      route: { distanceKm: 20, dureeMinutes: 30 },
      nuit: { lieu: 'Secteur Camaret-sur-Mer', aConfirmer: true },
      activites: [
        'Port de Camaret-sur-Mer et sa tour Vauban',
        'Sentier des falaises de la pointe de Pen-Hir',
        'Vue sur les Tas de Pois, rochers alignés face à la mer',
      ],
    },
    {
      jour: 3,
      titre: 'Morgat et cap de la Chèvre',
      description: 'Activité nautique envisagée.',
      route: { distanceKm: 25, dureeMinutes: 35 },
      nuit: { lieu: 'Secteur Crozon – Morgat', aConfirmer: true },
      activites: [
        'Activité nautique au départ de Morgat, selon la météo',
        'Sentier côtier jusqu’au cap de la Chèvre',
      ],
    },
    {
      jour: 4,
      titre: 'Pointe Saint-Mathieu',
      description: 'Nuit dans le secteur Iroise.',
      route: { distanceKm: 95, dureeMinutes: 95 },
      nuit: { lieu: 'Secteur Iroise (Le Conquet – Plougonvelin)', aConfirmer: true },
      activites: [
        'Traversée de la rade de Brest par le pont de Térénez',
        'Pointe Saint-Mathieu : phare et ruines de l’abbaye face à la mer d’Iroise',
        'Coucher de soleil sur l’océan',
      ],
    },
    {
      jour: 5,
      titre: 'Retour à Rennes',
      description: 'Restitution du van.',
      route: { distanceKm: 270, dureeMinutes: 180 },
      nuit: null,
      activites: [
        'Dernière matinée sur la côte',
        'Route du retour et restitution du van à Rennes',
      ],
    },
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

  faq: [
    {
      question: 'Quel permis faut-il pour conduire le van ?',
      reponse: 'Le permis B suffit pour un van aménagé de moins de 3,5 tonnes, ce qui est le cas des vans de ce type. ' +
        "L'ancienneté de permis demandée et l'âge minimum du conducteur restent à préciser.",
      aConfirmer: true,
    },
    {
      question: 'Une caution est-elle demandée ?',
      reponse: 'Comme pour toute location de véhicule, un dépôt de garantie sera demandé au départ et restitué au retour du van. ' +
        'Son montant et sa forme seront précisés par Vanlife lors de la confirmation.',
      aConfirmer: true,
    },
    {
      question: 'Les animaux sont-ils acceptés ?',
      reponse: "La présence d'animaux de compagnie dans le van n'est pas encore définie. " +
        "Après votre demande, posez la question à Vanlife depuis votre espace de suivi.",
      aConfirmer: true,
    },
    {
      question: 'Puis-je annuler ma demande ?',
      reponse: "Oui. Tant que Vanlife n'a pas confirmé votre séjour, vous pouvez annuler gratuitement depuis votre espace de suivi. " +
        "Les conditions d'annulation après confirmation seront précisées par Vanlife.",
      aConfirmer: true,
    },
    {
      question: "Que se passe-t-il s'il fait mauvais temps ?",
      reponse: "Le programme est indicatif : l'ordre des journées peut être ajusté selon la météo. " +
        'Prévoyez des vêtements chauds et imperméables et de bonnes chaussures de marche, même en été.',
      aConfirmer: false,
    },
    {
      question: "Et si l'activité nautique est annulée ?",
      reponse: "L'activité nautique est incluse sous réserve des conditions de mer et de météo. " +
        "Si elle ne peut pas avoir lieu, Vanlife proposera un report dans le séjour ou une solution de remplacement, à préciser.",
      aConfirmer: true,
    },
    {
      question: "Qu'est-ce qui est compris dans le prix ?",
      reponse: "Le prix indicatif comprend le van aménagé, quatre nuitées, une activité nautique (sous réserve des conditions) " +
        "et un panier d'accueil. Le carburant, les repas et les autres visites sont à prévoir en plus.",
      aConfirmer: false,
    },
    {
      question: 'Où dort-on ?',
      reponse: 'Dans le van, sur des emplacements choisis par Vanlife à chaque étape. Les lieux exacts (aires, campings partenaires) restent à confirmer.',
      aConfirmer: true,
    },
    {
      question: 'Comment se passe la réservation ?',
      reponse: 'Vous choisissez un départ et envoyez une demande, sans engagement ni paiement. Vous recevez un e-mail avec votre lien ' +
        'de suivi ; Vanlife vérifie la disponibilité puis confirme votre séjour par e-mail.',
      aConfirmer: false,
    },
  ],

  van: {
    presentation: 'Van aménagé pour deux personnes, conduisible avec le permis B. Le modèle et son équipement exact seront ' +
      'précisés par Vanlife : la liste ci-dessous est indicative.',
    equipements: [
      { categorie: 'Couchage', detail: 'Lit double pour deux personnes, linge de lit fourni' },
      { categorie: 'Cuisine', detail: 'Réchaud deux feux, réfrigérateur, évier, vaisselle et ustensiles pour deux' },
      { categorie: 'Eau', detail: "Réservoir d'eau propre et réservoir d'eaux usées" },
      { categorie: 'Chauffage', detail: 'Chauffage stationnaire, utilisable moteur arrêté' },
      { categorie: 'Énergie', detail: 'Batterie auxiliaire, éclairage intérieur et prises USB' },
      { categorie: 'Rangements', detail: 'Placards et coffres pour les bagages de deux personnes' },
    ],
  },
}
