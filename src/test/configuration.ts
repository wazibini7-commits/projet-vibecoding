// Réglages communs à tous les tests (vite.config.ts → test.setupFiles).
import { configure } from '@testing-library/dom'

// Les recherches asynchrones (findBy…) attendent jusqu'à 5 s au lieu de 1 s : le premier chargement
// d'une page « chargée à la demande » peut dépasser 1 s quand la machine est occupée (échecs aléatoires
// observés dans la suite complète, jamais en lançant un fichier seul).
configure({ asyncUtilTimeout: 5000 })
