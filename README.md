# Vanlife — Bretagne Sauvage · Demande de réservation

Application web responsive (smartphone et ordinateur) : un visiteur découvre le circuit
**Bretagne Sauvage** (5 jours / 4 nuits, 2 personnes, départ et retour à Rennes), comprend son
prix indicatif et ses prestations, choisit un **départ disponible** et envoie une **demande de réservation**,
enregistrée en base de données avec une référence (`VL-2026-0001`).

> **Version de démonstration — offre et disponibilités à confirmer.**
> Les demandes sont enregistrées sans engagement ni paiement. Utilisez des coordonnées fictives.
>
> La version 1.0 (prototype 100 % navigateur, envoi simulé) est conservée dans l'historique git.

---

## 1. Prérequis

| Outil | Version | Vérifier |
|---|---|---|
| [Node.js](https://nodejs.org) (inclut npm) | 20.12 ou plus récent (testé avec 24) | `node --version` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | récent, **démarré** | `docker info` |
| Chrome ou Edge | récent | uniquement pour `npm run demo` |

## 2. Installation (une seule fois)

```bash
npm install                 # site (dossier racine)
cd backend
npm install                 # serveur
cp .env.example .env        # adresse de la base de données
npm run db:up               # démarre PostgreSQL (Docker)
npm run db:migrate          # crée les tables
npm run db:seed             # remplit la base : séjour, départs 2027, demandes fictives
```

## 3. Lancement — deux terminaux

| Terminal | Commande | Adresse |
|---|---|---|
| 1 — serveur | `cd backend` puis `npm run dev` | API sur http://localhost:3100 |
| 2 — site | `npm run dev` (à la racine) | **http://localhost:5173** |

Le site redirige ses appels `/api` vers le serveur (réglage dans `vite.config.ts`).
Après un redémarrage de l'ordinateur : démarrer Docker Desktop, puis `npm run db:up` dans `backend/`.

- **Sur un smartphone** (même réseau Wi-Fi) : `npm run dev -- --host`, puis ouvrir l'adresse *Network* affichée.
- **Simuler un smartphone sur ordinateur** : `F12` puis `Ctrl+Shift+M`, choisir une largeur de 390 px.
- **Version optimisée** : `npm run build` puis `npm run preview` → http://localhost:4173 (le serveur doit tourner).
- **Voir les demandes enregistrées** : `npm run db:studio` dans `backend/`.

## 4. Vérifications

| Commande | Rôle |
|---|---|
| `npm run lint` | qualité du code (ESLint) |
| `npm test` | 99 tests du site : règles de validation, liste des départs, parcours complet dans l'interface avec un faux serveur (pannes comprises), photos et crédits |
| `npm run build` | contrôle TypeScript + compilation de production |
| `npm run verifier` | les trois commandes ci-dessus d'un coup |
| `cd backend && npm run verifier` | 38 tests de l'API sur une base de test séparée + contrôle TypeScript |
| `npm run demo` | parcours complet dans Chrome/Edge à 390 px et 1366 px, avec captures dans `docs/captures/` (serveur et site lancés). **Enregistre de vraies demandes** dans la base de développement (adresses `camille.demo+…@exemple.fr`) |

## 5. Parcours à présenter

0. **La marque** — accueil immersif VANLIFE.BZH (« Voyagez autrement. Vivez la route. »), puis le concept Vanlife.
1. **Découvrir** — le séjour pilote Bretagne Sauvage, chargé depuis la base : durée, public, départ/retour, prix indicatif.
2. **Comprendre** — programme J1 à J5, prix indicatif 1 390 € pour 2, inclus / à prévoir.
3. **Demander** — bouton « Demande » : page de demande (`#/demande`), liste des départs avec les vans restants
   (départs complets grisés), prénom, e-mail. Essayer : demande vide, e-mail `camille@exemple`.
4. **Vérifier** — récapitulatif (circuit, dates aller/retour, coordonnées), bouton *Modifier*.
5. **Envoyer** — la demande est enregistrée : référence `VL-AAAA-NNNN`, réservation à confirmer par Vanlife.
   Montrer ensuite la demande dans Prisma Studio, et la place en moins dans la liste des départs.

## 6. Organisation du code

```
src/                        SITE (React)
├── api/
│   ├── client.ts           Appels au serveur (séjour, départs, envoi, suivi) et messages en cas de panne
│   └── requetes.ts         Chargement des données dans les composants (TanStack Query : cache, nouvel essai)
├── data/sejour.ts          Contenu du circuit : source du remplissage de la base (npm run db:seed)
├── data/marque.ts          Identité Vanlife : nom, signature, présentation, principes
├── data/medias.ts          Catalogue des photos/vidéo : fichier, texte alternatif, lieu, auteur, licence
├── domain/                 Logique métier, PARTAGÉE avec le serveur
│   ├── types.ts            Types du séjour, de la demande et contrat de l'API
│   └── validation.ts       Règles et messages d'erreur du formulaire (appliqués aussi par le serveur)
├── utils/                  Dates (calculs sans décalage de fuseau), formats (prix, durée), navigation
├── components/
│   ├── layout/             Bandeau démo, en-tête (menu mobile), accueil immersif, pied de page + crédits
│   ├── sejour/             Concept Vanlife, séjour (chargé depuis l'API), programme, prix, galerie
│   ├── demande/            Formulaire, liste des départs, résumé d'erreurs, récapitulatif
│   └── ui/                 Briques réutilisables : bouton, champ, liste, chargement/erreur, photo, vidéo…
├── pages/                  Accueil, page de demande (#/demande, chargée à la demande), confirmation
├── test/serveurFactice.ts  Faux serveur (MSW) pour les tests de l'interface
└── styles/global.css       Charte graphique et responsive (mobile d'abord)

backend/                    SERVEUR (Fastify + PostgreSQL + Prisma) — détails dans backend/README.md
├── prisma/                 Tables (schema.prisma), migrations SQL, remplissage (seed.ts)
├── src/routes/             Adresses de l'API
├── src/services/           Règles du serveur : départs, places restantes, enregistrement, suivi
└── tests/                  Tests de l'API

docker-compose.yml          Base PostgreSQL de développement (port 5433)
scripts/demo.mjs            Démonstration automatisée
docs/                       Fiche de restitution, journal, captures d'écran
```

**Modifier l'offre** (prix, programme, prestations) : éditer `src/data/sejour.ts`, puis `npm run db:seed` dans `backend/`.
**Ouvrir ou fermer des départs** : table `departs` (Prisma Studio) — une interface d'administration est prévue.
**Modifier une règle du formulaire** : `src/domain/validation.ts` — elle s'applique au site ET au serveur.

## 7. Choix techniques

**Une seule source pour les règles** : le serveur réutilise `src/domain/validation.ts` et les types de
`src/domain/types.ts`. Les messages d'erreur sont identiques au caractère près ; le serveur ajoute ce qu'il est seul
à savoir (départ existant, places restantes, doublon).

**Pas de double réservation** : le départ est verrouillé dans la base pendant le comptage des places.

**Pannes** : si le serveur ne répond pas, le site l'explique et propose « Réessayer » ; la saisie n'est jamais perdue.

**Navigation** : chaque page a sa propre adresse après le « # » (`#/` accueil, `#/demande` demande).
Le bouton « Précédent » du navigateur fonctionne et aucun réglage d'hébergement n'est nécessaire.

Site : React 19 + TypeScript (strict) + Vite 6 · TanStack Query · police Playfair Display servie localement ·
Vitest + Testing Library + MSW pour les tests · ESLint · Puppeteer (démo uniquement).
Serveur : Fastify 5 · PostgreSQL 18 (Docker) · Prisma 6 · Vitest.

## 8. Photographies et vidéo

- **Source** : Wikimedia Commons, licences libres uniquement (CC0, CC BY, CC BY-SA). Chaque photo a été
  vérifiée visuellement : elle montre bien le lieu indiqué (Pen-Hir, Morgat, Camaret, cap de la Chèvre,
  pointe Saint-Mathieu, Rennes…). La vidéo montre les Tas de Pois depuis la pointe de Pen-Hir.
- **Photos d'ambiance** (van, intérieur, route) : marquées « Photo d'illustration » ; elles ne montrent pas
  le véhicule Vanlife et ne présentent aucun équipement comme inclus.
- **Crédits obligatoires** : auteur, licence et lien source affichés sous chaque photo et listés dans le
  pied de page (« Crédits photographiques et vidéo »). Ne pas les retirer.
- **Vidéo** : muette, en boucle, chargée seulement quand elle devient visible, bouton Pause ; remplacée par
  une image fixe si le visiteur réduit les animations, économise ses données, ou si la lecture échoue.
- **Remplacer une photo** : déposer `nom-l.webp` et `nom-s.webp` dans `public/medias/`, puis mettre à jour
  l'entrée correspondante dans `src/data/medias.ts` (un test vérifie fichiers et crédits).

## 9. Pas encore réalisé

E-mails automatiques, interface d'administration (traitement des demandes, ouverture des départs),
page de suivi pour le client (l'API existe déjà : `POST /api/demandes/suivi`), paiement, mise en ligne.

Voir aussi : [`docs/FICHE_RESTITUTION.md`](docs/FICHE_RESTITUTION.md) et [`backend/README.md`](backend/README.md).
