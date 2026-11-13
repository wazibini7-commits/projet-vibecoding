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
- `docs/FICHE_RESTITUTION.md` et sa version PDF (une page A4, vérifiée) — depuis renommée en `FICHE_RESTITUTION_V1.md`.
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

---
---

# Partie 2 — Application complète (serveur, base de données, e-mails)

**Décision :** dépasser le prototype (cahier des charges § 9.4 : pas de stockage ni d'e-mails) pour en faire une
application réellement utilisable. La version 1.0 reste dans l'historique git ; sa fiche est
`docs/FICHE_RESTITUTION_V1.md`, celle de la version 2 `docs/FICHE_RESTITUTION_V2.md`.
**Choix techniques :** Node.js + TypeScript (Fastify) + PostgreSQL + Prisma, pour réutiliser côté serveur les règles
déjà écrites en TypeScript pour le site. Paiement volontairement écarté (projet d'école).

---

## Étape B1 — Base de données

**Réalisé :**
- PostgreSQL 18 dans Docker (`docker-compose.yml`), schéma Prisma : séjours, programme, prestations, départs,
  clients, demandes, historique des statuts, utilisateurs. Montants en centimes, dates sans heure.
- Migration initiale et remplissage (`seed.ts`) : le séjour est lu dans `src/data/sejour.ts` (une seule source),
  31 départs (chaque samedi d'avril à octobre 2027, 2 vans — hypothèse), 3 demandes fictives.

**Problèmes constatés et corrigés :**
- port 5432 déjà occupé par un PostgreSQL installé sur la machine → base Docker sur le port 5433 ;
- l'ancien backend Flask n'avait pas été archivé → déplacé dans le dossier d'archive (rien supprimé).

**Vérifié :** remplissage relançable sans doublons ; contrôle des données par requêtes SQL.

---

## Étape B2 — API (Fastify)

**Réalisé :**
- Adresses : séjours, départs avec places restantes, création de demande, santé du serveur.
- Les règles de saisie sont **celles du site** (`src/domain/validation.ts`), mêmes messages au caractère près ;
  le serveur ajoute : départ existant et ouvert, places restantes, pas de doublon.
- **Pas de double réservation** : départ verrouillé pendant le comptage (5 demandes simultanées → 1 acceptée).
- Anti-spam (10 demandes/min), CORS limité au site, en-têtes de sécurité, références `VL-AAAA-NNNN`.

**Problèmes constatés et corrigés :**
- port 3001 occupé par un autre logiciel (Uptime Kuma), qui répondait à la place de l'API → port 3100 ;
- les erreurs de saisie n'étaient pas toutes signalées en une fois (date sans départ annoncée seulement après
  correction des autres champs) → toutes les erreurs dans la même réponse.

**Vérifié :** 38 tests sur une base de test séparée (`vanlife_test`).

---

## Étape B3 — Site branché sur l'API

**Réalisé :**
- Contenu du séjour chargé depuis l'API (TanStack Query) ; la marque s'affiche sans attendre le serveur.
- Champ date libre remplacé par la **liste des départs réels** (regroupés par mois, vans restants, complets grisés).
- Envoi réel, vraie référence, textes « envoi simulé » remplacés ; départ devenu complet entre-temps et pannes du
  serveur expliqués, saisie jamais perdue.
- Tests du parcours avec un faux serveur (MSW) qui applique les mêmes règles ; démonstration adaptée.

**Problèmes constatés (sur les captures) et corrigés :**
- le pied de page affirmait encore « aucune donnée n'est enregistrée » ;
- libellé du départ coupé sur smartphone → libellé raccourci (l'année est dans le titre du mois).

**Vérifié :** 99 tests ; démonstration réussie avec demandes réellement enregistrées en base.

---

## Étape B4 — E-mails automatiques

**Réalisé :**
- Accusé de réception au client, notification à l'équipe ; versions texte et mise en forme, valeurs échappées.
- **File d'envoi** en base : e-mails enregistrés avec la demande, envoyés en arrière-plan, nouveaux essais
  (1 min, 5 min, 15 min, 1 h), jamais envoyés deux fois. Mailpit capture les e-mails en développement.

**Problème constaté et corrigé :** « samedi 1 mai » → « samedi **1er** mai » (fonction de date commune).

**Vérifié :** 53 tests ; **essai de panne réel** : messagerie arrêtée, demande acceptée, e-mails partis seuls
au redémarrage de la messagerie.

---

## Étape B5 — Back-office

**Réalisé :**
- Connexion (mots de passe Argon2id, session en cookie `httpOnly` + `SameSite=Strict`, contrôle d'origine,
  5 essais/min, aucun compte par défaut — création en ligne de commande).
- Liste filtrable, détail, changement de statut contrôlé (avec e-mail au client), note interne, départs
  (capacité, ouverture/fermeture), export tableur protégé contre l'injection de formules. Rôles admin / gestionnaire.

**Problèmes constatés et corrigés :**
- un visiteur non connecté recevait « requête invalide » au lieu de « non connecté » → connexion vérifiée en premier ;
- « Se déconnecter » ne ramenait pas à la page de connexion ;
- une demande introuvable affichait « le serveur ne répond pas » ;
- e-mail du client mal placé dans les cartes sur smartphone ; lien de retour presque invisible ;
- **tests aléatoirement en échec** (≈ 1 fois sur 10) : premier chargement d'une page « à la demande » plus long
  que le délai d'attente des tests (1 s) → pages pré-chargées, délai 5 s ; 4 suites complètes sans échec.

**Vérifié :** 92 tests serveur, 124 tests site ; parcours réel dans Chrome (statut confirmé, e-mail reçu).

---

## Étape B6 — Espace client

**Réalisé :**
- **Lien personnel** (« lien magique ») dans chaque e-mail au client ; secret de 256 bits stocké en empreinte.
- Étapes de la demande, échange de messages avec l'équipe (réponse depuis le back-office), annulation tant que
  le séjour n'est pas confirmé. Lien perdu : nouveau lien **envoyé par e-mail** (3 par heure au plus).

**Problèmes constatés et corrigés :**
- le suivi par référence + e-mail (étape B2) aurait permis à un tiers d'annuler une demande (références qui se
  suivent, e-mail devinable) → supprimé, remplacé par le lien personnel ;
- limite « 3 liens par heure » comparant deux horloges différentes → une seule horloge.

**Vérifié :** 107 tests serveur, 137 tests site ; essai réel complet (lien de l'e-mail, message, réponse, annulation,
lien perdu, lien trafiqué refusé).

---

## Étape B7 — Contenu détaillé du séjour

**Réalisé :** programme détaillé (route, nuit, activités), **carte du circuit** en SVG à partir des coordonnées GPS
(sans service externe), **fiche du van**, **questions fréquentes** (9). En base, renvoyés par l'API ; les hypothèses
sont marquées « à confirmer ».

**Problèmes constatés et corrigés :**
- la FAQ invitait à « l'indiquer dans la demande » alors que le formulaire n'a pas de champ message ;
- étiquettes de la carte superposées, libellé « Zoom ci-dessous » faux sur ordinateur → carte réorganisée.

**Vérifié :** 143 tests site ; rendu contrôlé à 390, 1024 et 1366 px.

---

## Étape B8 — Démarrage en une commande et documents

**Réalisé :** `npm run demarrer` (vérifie Docker et les prérequis, démarre base et Mailpit, applique les migrations,
lance l'API et le site) ; README mis à jour ; fiche v1 renommée, **fiche v2** et son PDF (`scripts/fiche-pdf.mjs`).

**Vérifié :** démonstration complète réussie avec ce démarrage ; **essai complet par l'étudiant le 13/11/2026 : fonctionnel**.

---

## Résultats d'ensemble (version 2)

| Contrôle | Résultat |
|---|---|
| `npm run lint` | 0 erreur |
| `npm test` (site) | 143/143 |
| `cd backend && npm test` (serveur) | 107/107 |
| `npm run build` | OK |
| `npm run demo` | réussie (390 et 1366 px) |

## Restant à faire (mise à jour)

1. Faire tester le parcours par **une autre personne** et le noter dans la fiche v2.
2. **Assistant IA (chatbot)** s'appuyant sur le contenu du séjour en base.
3. RGPD : mentions légales, politique de confidentialité, suppression des données anciennes.
4. Faire valider par Vanlife les éléments « à confirmer » (liste en fin de fiche v2).
5. ~~Supprimer le dossier `backend/` resté à la racine~~ : fait à l'étape B1 (archivé, puis remplacé par le nouveau serveur).
