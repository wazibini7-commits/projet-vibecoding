// Catalogue des photographies et vidéos du prototype.
//
// Toutes proviennent de Wikimedia Commons, sous licence libre (CC0, CC BY, CC BY-SA).
// Chaque fichier a été vérifié visuellement : il représente bien le lieu indiqué.
// Les images ont été redimensionnées et converties en WebP (2 tailles) ; les fichiers sont
// servis localement depuis public/medias/ (aucun lien externe au chargement).
// Les licences CC BY et CC BY-SA imposent de créditer l'auteur : voir le pied de page.

export interface Credit {
  auteur: string
  licence: string
  urlLicence: string
  /** Page de la photo sur Wikimedia Commons. */
  source: string
}

export interface Media {
  id: string
  /** Grande taille (largeur `largeur`) et petite taille (800 px). */
  src: { l: string; s: string }
  largeur: number
  hauteur: number
  alt: string
  /** Lieu réellement photographié. */
  lieu: string
  /** Photo d'ambiance qui ne montre ni un lieu du séjour ni le véhicule Vanlife. */
  illustration?: boolean
  credit: Credit
}

const BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0/'
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/'
const BY_3 = 'https://creativecommons.org/licenses/by/3.0/'
const BY_4 = 'https://creativecommons.org/licenses/by/4.0/'
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
const COMMONS = 'https://commons.wikimedia.org/wiki/File:'

function media(id: string, largeur: number, hauteur: number, infos: Omit<Media, 'id' | 'src' | 'largeur' | 'hauteur'>): Media {
  return { id, src: { l: `/medias/${id}-l.webp`, s: `/medias/${id}-s.webp` }, largeur, hauteur, ...infos }
}

// ---------- Accueil ----------

export const HERO = media('hero-pen-hir', 1920, 1277, {
  alt: 'Les rochers des Tas de Pois au large de la pointe de Pen-Hir, eau turquoise et falaises',
  lieu: 'Pointe de Pen-Hir et Tas de Pois, Camaret-sur-Mer',
  credit: { auteur: 'Calips', licence: 'CC BY-SA 3.0', urlLicence: BY_SA_3, source: `${COMMONS}France_Bretagne_29_POINTE_DE_PENHIR_01.jpg` },
})

export const VIDEO_TAS_DE_POIS = {
  src: '/medias/hero-tas-de-pois.webm',
  affiche: media('hero-tas-de-pois-affiche', 1920, 1080, {
    alt: 'Les Tas de Pois filmés depuis la pointe de Pen-Hir, mer scintillante au soleil',
    lieu: 'Tas de Pois, pointe de Pen-Hir',
    credit: { auteur: 'Calcineur', licence: 'CC BY-SA 3.0', urlLicence: BY_SA_3, source: `${COMMONS}Les_Tas_de_Pois_%C3%A0_la_Pointe_de_Penhir,_Camaret-sur-Mer,_Finist%C3%A8re.ogv` },
  }),
}

// ---------- Séjour ----------

export const PHOTO_SEJOUR = media('sejour-la-palue', 1600, 900, {
  alt: 'La plage de la Palue et la pointe de Beg Goul ar Mor vues depuis le sentier côtier',
  lieu: "Plage de la Palue, presqu'île de Crozon",
  credit: { auteur: 'Limfjord69', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}P_20210531_Presqu%27%C3%AEle_de_Crozon;_Beg_Goul_ar_Mor_et_la_plage_de_la_Palue_depuis_Beg_ar_C%27houbez.jpg` },
})

/** Une photographie par journée du programme (clé = numéro du jour). */
export const PHOTOS_PROGRAMME: Record<number, Media> = {
  1: media('j1-morgat', 1600, 713, {
    alt: 'La grande plage de Morgat, voiliers dans la baie et falaises boisées',
    lieu: 'Plage de Morgat, Crozon',
    credit: { auteur: 'Lamiot', licence: 'CC BY-SA 3.0', urlLicence: BY_SA_3, source: `${COMMONS}Morgat_8008.jpg` },
  }),
  2: media('j2-camaret', 1600, 797, {
    alt: 'Épaves de bateaux le long du quai de Camaret-sur-Mer, le port et le village en arrière-plan',
    lieu: 'Port de Camaret-sur-Mer',
    credit: { auteur: 'Andree Stephan', licence: 'CC BY 3.0', urlLicence: BY_3, source: `${COMMONS}Camaret_sur_Mer_-_Mole.jpg` },
  }),
  3: media('j3-cap-de-la-chevre', 1600, 959, {
    alt: 'Crique turquoise bordée de bruyère au cap de la Chèvre',
    lieu: 'Cap de la Chèvre, Crozon',
    credit: { auteur: 'Thesupermat', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}Bretagne_-_Finist%C3%A8re_-_cap_de_la_ch%C3%A8vre_-_20180726_-_015.jpg` },
  }),
  4: media('j4-saint-mathieu', 1600, 1199, {
    alt: "Le phare et les ruines de l'abbaye de la pointe Saint-Mathieu au lever du jour",
    lieu: 'Pointe Saint-Mathieu, Plougonvelin',
    credit: { auteur: 'Stephane Lesbats (Ifremer)', licence: 'CC BY 4.0', urlLicence: BY_4, source: `${COMMONS}Lever_du_jour_sur_la_Pointe_Saint_Mathieu_(Ifremer_00809-92115_-_53403).jpg` },
  }),
  5: media('j5-rennes', 1600, 1067, {
    alt: 'Façade du palais du Parlement de Bretagne à Rennes sous un ciel bleu',
    lieu: 'Parlement de Bretagne, Rennes',
    credit: { auteur: 'Fab5669', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}Rennes_-_palais_du_Parlement_de_Bretagne_01.jpg` },
  }),
}

// ---------- Expérience du voyage en van (photos d'illustration) ----------

export const PHOTOS_EXPERIENCE: Media[] = [
  media('van-lancieux', 1600, 1285, {
    alt: 'Un combi Volkswagen jaune garé face à la mer sous les pins',
    lieu: "Lancieux, Côtes-d'Armor",
    illustration: true,
    credit: { auteur: 'Rundvald', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}VWCombiT2-Westfalia-Campmobile-toitPopTop-ChromeYellow-Lancieux-PlageSaintCieux-rueSource-byRundvald.jpg` },
  }),
  media('sentier-rostudel', 1200, 1245, {
    alt: 'Sentier côtier dominant une crique et un rocher isolé, entre Morgat et le cap de la Chèvre',
    lieu: 'Entre Morgat et le cap de la Chèvre',
    credit: { auteur: 'Limfjord69', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}P_20210531_De_Morgat_au_cap_de_la_Ch%C3%A8vre,_entre_la_pointe_de_Rostudel_et_la_pointe_du_Dolmen.jpg` },
  }),
  media('van-interieur', 1600, 1067, {
    alt: "Exemple d'intérieur de van aménagé : banquette, rangements et coin cuisine",
    lieu: 'Van aménagé (exemple)',
    illustration: true,
    credit: { auteur: 'Danny6060', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}VW_Transporter_Campervan_built_by_The_Wee_Camper_Co..jpg` },
  }),
  media('van-route', 1600, 1067, {
    alt: 'Un van aménagé arrêté au bord d’une route de campagne, porte latérale ouverte',
    lieu: 'Route de campagne (hors Bretagne)',
    illustration: true,
    credit: { auteur: 'CruiseAmerica', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}Campervan_at_the_side_of_the_road_in_the_countryside_with_its_door_open.jpg` },
  }),
]

// ---------- Galerie ----------

export const GALERIE: Media[] = [
  media('galerie-anse-pen-hir', 1920, 790, {
    alt: "Panorama de l'anse de Pen-Hir, rochers clairs au premier plan et presqu'île à l'horizon",
    lieu: 'Anse de Pen-Hir',
    credit: { auteur: 'Einaz80', licence: 'CC BY 4.0', urlLicence: BY_4, source: `${COMMONS}Anse_de_Pen_Hir.jpg` },
  }),
  media('galerie-falaises-pen-hir', 1600, 1067, {
    alt: 'Hautes falaises grises de la pointe de Pen-Hir plongeant dans la mer',
    lieu: 'Falaises de Pen-Hir',
    credit: { auteur: 'Thesupermat', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}Le_Bresto%C3%A2_-_Presqu%27%C3%AEle_de_Crozon_-_20210719-_070.jpg` },
  }),
  media('galerie-cap-de-la-chevre', 1600, 1067, {
    alt: 'Côte boisée et mer bleue au cap de la Chèvre',
    lieu: 'Cap de la Chèvre',
    credit: { auteur: 'Thesupermat', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}Bretagne_-_Finist%C3%A8re_-_cap_de_la_ch%C3%A8vre_-_20180726_-_010.jpg` },
  }),
  media('galerie-lostmarch', 1920, 552, {
    alt: "Panorama de la plage de Lostmarc'h, sable clair et lande",
    lieu: "Plage de Lostmarc'h, Crozon",
    credit: { auteur: 'Farz brujunet', licence: 'CC BY-SA 3.0', urlLicence: BY_SA_3, source: `${COMMONS}Breizh_29_-_Kraozon_-_traezh_lostmarc%27h_03.JPG` },
  }),
  media('galerie-camaret-port', 1600, 1200, {
    alt: 'Le port et le village de Camaret-sur-Mer vus depuis le quai',
    lieu: 'Camaret-sur-Mer',
    credit: { auteur: 'Selmoval', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}Camaret-sur-Mer_%CC%A0_Port_01.jpg` },
  }),
  media('galerie-veryach', 1600, 900, {
    alt: "La baie au sud de Pen-Hir, avec les plages du Veryac'h et de Lamzoz",
    lieu: "Baie du Veryac'h",
    credit: { auteur: 'Romainbehar', licence: 'CC0', urlLicence: CC0, source: `${COMMONS}Camaret-sur-Mer_-_Pointe_de_Pen-hir_-_Vue_sur_la_baie_au_sud,_avec_la_plage_du_Veryac%27h_%C3%A0_gauche_et_la_plage_de_Lamzoz_au_centre.jpeg` },
  }),
  media('galerie-anse-du-fret', 1600, 900, {
    alt: "Le sentier côtier au-dessus de l'anse du Fret, eau bleue et rive boisée",
    lieu: 'Anse du Fret, Crozon',
    credit: { auteur: 'Limfjord69', licence: 'CC BY-SA 4.0', urlLicence: BY_SA_4, source: `${COMMONS}P_20210528_L%27anse_du_Fret.jpg` },
  }),
  media('galerie-saint-mathieu', 1600, 1198, {
    alt: "Vue aérienne de la pointe Saint-Mathieu, son phare et l'abbaye au bord de la mer d'Iroise",
    lieu: "Pointe Saint-Mathieu, mer d'Iroise",
    credit: { auteur: 'Stephane Lesbats (Ifremer)', licence: 'CC BY 4.0', urlLicence: BY_4, source: `${COMMONS}Lever_du_jour_sur_la_Pointe_Saint_Mathieu_(Ifremer_00809-92115_-_53398).jpg` },
  }),
]

/** Tous les médias affichés, pour la liste des crédits. */
export const TOUS_LES_MEDIAS: Media[] = [
  HERO, VIDEO_TAS_DE_POIS.affiche, PHOTO_SEJOUR, ...Object.values(PHOTOS_PROGRAMME), ...PHOTOS_EXPERIENCE, ...GALERIE,
]
