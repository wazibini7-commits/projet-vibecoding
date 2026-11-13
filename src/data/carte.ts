// Géographie du circuit pour la carte (src/components/sejour/CarteCircuit.tsx).
// Coordonnées GPS réelles (degrés décimaux, arrondies) ; la carte est dessinée par le site, sans service externe.
// Le tracé relie les étapes en ligne droite : il est SCHÉMATIQUE, pas l'itinéraire routier exact.

export interface Lieu {
  id: string
  nom: string
  lat: number
  lon: number
  /** Étape du séjour (point plein) ou simple repère (point creux). */
  type: 'etape' | 'repere'
  /** Position de l'étiquette par rapport au point. */
  etiquette: 'droite' | 'gauche' | 'haut' | 'bas'
}

export const LIEUX: Record<string, Lieu> = {
  rennes: { id: 'rennes', nom: 'Rennes', lat: 48.117, lon: -1.678, type: 'etape', etiquette: 'gauche' },
  morgat: { id: 'morgat', nom: 'Crozon – Morgat', lat: 48.225, lon: -4.497, type: 'etape', etiquette: 'droite' },
  camaret: { id: 'camaret', nom: 'Camaret-sur-Mer', lat: 48.276, lon: -4.597, type: 'etape', etiquette: 'haut' },
  penHir: { id: 'penHir', nom: 'Pen-Hir', lat: 48.252, lon: -4.623, type: 'etape', etiquette: 'gauche' },
  capChevre: { id: 'capChevre', nom: 'Cap de la Chèvre', lat: 48.169, lon: -4.553, type: 'etape', etiquette: 'gauche' },
  saintMathieu: { id: 'saintMathieu', nom: 'Pointe Saint-Mathieu', lat: 48.33, lon: -4.771, type: 'etape', etiquette: 'droite' },
  brest: { id: 'brest', nom: 'Brest', lat: 48.39, lon: -4.486, type: 'repere', etiquette: 'droite' },
  leFaou: { id: 'leFaou', nom: 'Le Faou', lat: 48.294, lon: -4.177, type: 'repere', etiquette: 'bas' },
}

/** Ordre de passage sur la presqu'île et en Iroise (jours 1 à 4), Le Faou et Brest compris (contournement de la rade). */
export const TRACE_PRESQU_ILE = ['morgat', 'camaret', 'penHir', 'morgat', 'capChevre', 'leFaou', 'brest', 'saintMathieu']

/** Numéro de jour affiché à côté de chaque étape. */
export const JOURS_PAR_LIEU: Record<string, string> = {
  rennes: 'J1 · J5',
  morgat: 'J1 · J3',
  camaret: 'J2',
  penHir: 'J2',
  capChevre: 'J3',
  saintMathieu: 'J4',
}

/** Étendues d'eau nommées : position approximative du libellé, en mer. */
export const MERS = [
  { nom: "Mer d'Iroise", lat: 48.2, lon: -4.78 },
  { nom: 'Rade de Brest', lat: 48.345, lon: -4.47 },
  { nom: 'Baie de Douarnenez', lat: 48.155, lon: -4.37 },
]
