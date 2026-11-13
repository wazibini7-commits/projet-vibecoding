# Journal de réalisation — Vanlife « Bretagne Sauvage »

Ce document retrace, étape par étape, ce qui a été fait sur le projet : les décisions prises, les fichiers
concernés, les vérifications réalisées et les problèmes rencontrés (avec leur correction).

---

## Étape 0 — Première version (abandonnée) : Vue.js + Python

**Demande :** implémenter le brief client (3 pages), backend en Python, frontend en Vue.js.

**Réalisé :**
- Backend **Flask** : `GET /api/circuit` (contenu du séjour), `POST /api/demandes` (validation + réponse simulée,
  sans stockage), 10 tests pytest.
- Frontend **Vue 3 + Vite** : page principale, formulaire, récapitulatif, confirmation.
- Test automatisé du parcours dans Chrome, notice de lancement, fiche de transmission.

**Problème constaté :** la confirmation s'affichait à mi-hauteur (défilement animé interrompu) → corrigé.

**Suite :** cette version a été abandonnée à la réception du **cahier des charges** et de la nouvelle architecture
(React + TypeScript, frontend uniquement). Elle n'a pas été supprimée : elle est conservée dans
`C:\Projet-IABD-ancienne-version\`.

---

## Étape 1 — Corriger et stabiliser le projet

**Problème signalé :** « Impossible de charger le circuit » ; `localhost:5000` renvoie « Not Found ».

**Diagnostic :**
- L'ancienne interface chargeait le séjour via une requête HTTP vers le serveur Python : sans serveur, rien ne s'affichait.
- « Not Found » sur `localhost:5000/` était normal : l'API ne répondait que sur `/api/...`.
- Surtout, le projet était en Vue + Python, alors que l'architecture validée impose **React + TypeScript, sans backend**.

**Réalisé :**
- Nouveau projet **React 19 + TypeScript (strict) + Vite**, à la racine de `C:\Projet-IABD`.
- Données du séjour définies localement dans `src/data/sejour.ts` : **aucune requête réseau**.
- Ancienne version déplacée (pas supprimée) dans un dossier d'archive.

**Vérifié :** démarrage sur `localhost:5173`, aucune requête vers un serveur, aucune erreur console.

---

## Étape 2 — Structure du projet

**Réalisé :**
```
src/
├── components/   éléments d'interface
├── pages/        pages de l'application
├── domain/       types et logique métier
├── data/         données locales du séjour
├── utils/        dates, formats
└── styles/       feuille de style
```
- Dépendances limitées au nécessaire : React et React DOM pour l'application ; TypeScript, ESLint et Vitest pour le développement.

---

## Étape 3 — Modèle de données et logique métier

**Réalisé :**
- `domain/types.ts` : types `Sejour`, `JourProgramme`, `PrixIndicatif` et, pour la demande, **trois types distincts** :
  - `DemandeSaisie` : données brutes du formulaire ;
  - `DemandeValidee` : données nettoyées et garanties conformes ;
  - `DemandeReservation` : demande simulée (référence `DEMO-…`, statut « simulée — à confirmer »).
- `domain/validation.ts` : champs obligatoires, format de l'e-mail, date réelle et postérieure à aujourd'hui, messages explicites.
- `domain/demande.ts` : `creerDemande()` → erreurs **ou** demande simulée (date de retour = départ + 4 jours).
- `utils/dates.ts` : calculs de dates sans décalage de fuseau horaire.

**Vérifié :** 28 tests, lint et compilation OK. La logique métier n'importe pas React (vérifié).

---

## Étape 4 — Tests de la logique métier (Vitest)

**Réalisé :** tests organisés selon la consigne :
1. champs vides ;
2. e-mails incorrects (8 cas refusés, 3 cas valides acceptés) ;
3. dates manquantes ou invalides (format français, 30 février…) ;
4. dates passées (règle retenue : départ au plus tôt le lendemain) ;
5. demande valide (données nettoyées, saisie d'origine non modifiée).

**Vérifié :** 43 tests réussis. La date du jour est injectée pour que les tests ne dépendent pas du calendrier.

---

## Étape 5 — Composants d'interface

**Réalisé :** composants réutilisables, sans logique métier :
- `layout/` : bandeau de démonstration, en-tête, pied de page ;
- `sejour/` : présentation, programme, prix et prestations ;
- `demande/` : formulaire, résumé des erreurs, récapitulatif ;
- `ui/` : bouton, champ de formulaire, badge, section, alerte, liste récapitulative.

**Problèmes constatés et corrigés :**
- prix affiché « 1390 € » (espace fine invisible) → « 1 390 € » ;
- « Partenaires, Tarifs, Nuitées… » avec majuscules en milieu de phrase → reformulé.

---

## Étape 6 — Pages et intégration

**Réalisé :**
- `pages/AccueilPage.tsx` : page principale ; états gérés avec `useState` (saisie, erreurs, demande à vérifier).
- `pages/ConfirmationPage.tsx` : reçoit la demande validée et n'affiche qu'elle.
- `App.tsx` : bascule page principale ↔ confirmation, retour en haut de page, gestion du focus.
- Revalidation au moment de l'envoi (cas d'une date devenue passée entre-temps).

**Vérifié dans Chrome** (390 px et 1366 px) : 32 contrôles réussis sur tout le parcours.

---

## Étape 7 — Erreurs et interactions

**Réalisé :**
- erreurs affichées sous chaque champ et dans un résumé cliquable ;
- envoi impossible tant que le formulaire est invalide ;
- valeurs conservées après une erreur et après « Modifier » ;
- « envoi simulé » rappelé à 4 endroits ;
- 12 tests d'interaction automatisés (React Testing Library).

**Problème constaté et corrigé :** une date partiellement saisie (« 14/05/ ») était signalée comme « vide ».
Le message est désormais « La date de départ est incomplète… ».

**Vérifié :** 56 tests réussis ; cas de la date incomplète testé dans un vrai navigateur.

---

## Étape 8 — Design, responsive et accessibilité

**Audit mesuré** (contrastes, tailles des zones tactiles, ordre au clavier, largeurs de 320 à 1366 px), puis corrections :

| Point | Avant | Après |
|---|---|---|
| Bordure des champs | contraste 1,54:1 | 4,15:1 |
| Contour du focus clavier sur fond bleu | 1,65:1 | ≥ 5,3:1 (jaune) |
| En-tête sur smartphone | 2 lignes | 1 ligne |
| Lien « Aller au contenu » | absent | ajouté |
| Texte agrandi à 200 % | débordement | corrigé |

---

## Étape 9

Non communiquée.

---

## Étape 10 — Préparation de la livraison

**Réalisé :**
- `README.md` : installation, lancement, vérifications, organisation du code.
- `docs/FICHE_RESTITUTION.md` et sa version PDF (une page A4, vérifiée).
- `scripts/demo.mjs` : démonstration automatisée du parcours complet (`npm run demo`), avec captures d'écran.
- Commande `npm run verifier` (lint + tests + build).
- Nettoyage : ancienne version déplacée hors du projet, `dist/` supprimé.
- Archive de livraison, testée depuis une copie vierge.

**Problème constaté et corrigé (le principal de la fiche) :** sur smartphone, la confirmation pouvait s'afficher
à mi-hauteur si un défilement doux était encore en cours au moment du clic. Problème reproduit 5 fois sur 5
avant correction, 0 fois sur 5 après.

---

## Mission design — Identité Vanlife, photos et vidéo

**Demande :** design immersif inspiré des sites de voyage haut de gamme, identité Vanlife visible, vraies photos des lieux.

**Méthode pour les médias :**
1. Recherche sur **Wikimedia Commons**, en ne retenant que les licences libres (CC0, CC BY, CC BY-SA).
2. **Vérification visuelle** de chaque candidat sur des planches contact : chaque photo montre bien le lieu indiqué.
3. Conversion en WebP (2 tailles), recompression des fichiers lourds.
4. Enregistrement de l'auteur, de la licence et de la source de chaque fichier dans `data/medias.ts`.

**Réalisé :**
- accueil immersif (photo des Tas de Pois, pointe de Pen-Hir) : marque VANLIFE.BZH, signature, 2 boutons ;
- section « Concept Vanlife » ; séjour Bretagne Sauvage présenté comme séjour pilote, avec une grande photo ;
- programme illustré : une photo réelle par jour ;
- galerie de 8 photos, agrandissement au clic ;
- en-tête avec menu mobile ; pied de page avec crédits photographiques ;
- police de titres Playfair Display servie localement ;
- animations discrètes, désactivées si le visiteur réduit les animations.

**Règles respectées :**
- les photos de van, d'intérieur et de route sont marquées « Photo d'illustration » ;
- aucun équipement ni service n'est présenté comme inclus ;
- la mention de démonstration est conservée ;
- la logique métier n'a pas été modifiée.

**Problèmes constatés et corrigés :**
- **Vidéo de qualité modeste** (480p, caméra embarquée) : déplacée de l'accueil vers une case de taille normale, ligne parasite masquée.
- **Animation d'apparition** qui laissait des sections invisibles dans les captures pleine page → remplacée par un simple glissement, sans transparence.

**Vérifié :**
- 81 tests ;
- démonstration : 42 contrôles réussis, dont 19 photos chargées sans erreur ;
- vidéo et image de remplacement testées ;
- menu mobile et galerie testés au clavier ;
- aucun débordement horizontal à 390, 768 et 1366 px ;
- tous les contrastes ≥ 5,2:1.

---

## Résultats d'ensemble

| Contrôle | Résultat |
|---|---|
| `npm run lint` | 0 erreur |
| `npm test` | 81/81 |
| `npm run build` | OK |
| `npm run demo` | 42/42 |

## Restant à faire

1. Faire tester le parcours par **une autre personne** et le noter dans la fiche (exigé par le cahier des charges).
2. Remplacer les photos d'illustration par des **visuels Vanlife** (vrai van, partenaires).
3. Faire valider par Vanlife le prix, les prestations, les nuitées, l'activité nautique, les dates de départ et les textes de la marque.
4. Supprimer le dossier `backend/` resté à la racine (bloqué par un terminal ouvert).

---

## Évolution — Page « Demande de réservation » séparée

**Demande :** que le formulaire soit sur une page à part, ouverte en cliquant sur « Demande ».

**Réalisé :**
- **Navigation par l'adresse après le « # »** (`utils/navigation.ts`) : `#/` = accueil, `#/demande` = page de demande,
  `#programme`, `#prix`… = sections de l'accueil. Le bouton « Précédent » du navigateur fonctionne ; aucune
  bibliothèque ni réglage d'hébergement n'est nécessaire.
- **`pages/DemandePage.tsx`** : en-tête « Demande de réservation », lien « ← Retour au séjour », rappel du séjour
  choisi (photo, durée, voyageurs, Rennes, prix à confirmer), mention « envoi simulé », formulaire puis récapitulatif.
  La logique du formulaire a été **déplacée sans modification** depuis l'accueil.
- **Chargement à la demande** (`React.lazy`) : le code du formulaire est un fichier séparé (≈ 9 Ko) téléchargé au
  clic sur « Demande », avec un indicateur « Chargement du formulaire de demande… ».
- **Accueil** : le formulaire est remplacé par une invitation « Envie de prendre la route ? » (photo de la pointe
  Saint-Mathieu) avec le bouton « Faire une demande de réservation ».
- Tous les boutons « Demande » / « Faire une demande » mènent à la nouvelle page ; le lien du menu est signalé
  comme page courante (`aria-current`).
- Sur smartphone, le rappel du séjour s'affiche sans photo pour atteindre le formulaire plus vite.

**Vérifié :**
- 92 tests, dont 4 nouveaux sur la navigation et 7 sur l'analyse des adresses ;
- démonstration : 58 contrôles réussis (ouverture de la page, retour au séjour, bouton « Précédent », nouvelle
  demande avec formulaire vierge) ;
- aucun débordement à 390 et 1366 px.
