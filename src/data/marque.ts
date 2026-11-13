// Identité de l'entreprise Vanlife (distincte du séjour Bretagne Sauvage, qui est l'une de ses offres).
// Seuls des éléments issus du brief sont présentés : aucun service ni équipement non confirmé.

export const MARQUE = {
  nom: 'VANLIFE.BZH',
  nomCourt: 'Vanlife',
  activite: 'Voyages en van aménagé en Bretagne',
  signature: 'Voyagez autrement. Vivez la route.',
  presentation:
    'Découvrez la Bretagne autrement, au rythme de la route, des paysages et des expériences en van.',
} as const

/** Principes de l'offre Vanlife, tels que décrits dans le brief client. */
export const CONCEPT_VANLIFE = [
  {
    titre: 'Un itinéraire préparé',
    texte: "Les étapes sont pensées à l'avance : vous profitez de la route, des pointes et des plages sans tout organiser.",
  },
  {
    titre: 'Des expériences présentées clairement',
    texte: 'Chaque journée est décrite simplement, pour se projeter dans le voyage avant de partir.',
  },
  {
    titre: 'Le rythme du van',
    texte: 'Avancer à son rythme, au plus près de la côte, et s’arrêter là où le paysage le demande.',
  },
] as const
