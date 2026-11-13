# Vanlife — Bretagne Sauvage · Prototype de demande de réservation

Prototype web responsive (smartphone et ordinateur) : un visiteur découvre le circuit
**Bretagne Sauvage** (5 jours / 4 nuits, 2 personnes, départ et retour à Rennes), comprend son
prix indicatif et ses prestations, puis formule une **demande de réservation simulée**.

> **Version de démonstration — offre et disponibilités à confirmer.**
> Aucune donnée n'est enregistrée ni envoyée. Utilisez des coordonnées fictives.

---

## 1. Prérequis

| Outil | Version | Vérifier |
|---|---|---|
| [Node.js](https://nodejs.org) (inclut npm) | 18.18 ou plus récent (testé avec 24) | `node --version` |
| Chrome ou Edge | récent | uniquement pour `npm run demo` |

Aucun serveur, aucune base de données, aucun compte : l'application fonctionne entièrement dans le navigateur.

## 2. Installation (une seule fois)

Ouvrir un terminal dans le dossier du projet :

```bash
npm install
```

## 3. Lancement

```bash
npm run dev
```

Ouvrir **http://localhost:5173** dans le navigateur. Arrêter avec `Ctrl+C`.

- **Sur un smartphone** (même réseau Wi-Fi) : `npm run dev -- --host`, puis ouvrir l'adresse *Network* affichée.
- **Simuler un smartphone sur ordinateur** : `F12` puis `Ctrl+Shift+M`, choisir une largeur de 390 px.
- **Version optimisée** : `npm run build` puis `npm run preview` → http://localhost:4173.
  Le dossier `dist/` produit peut être déposé sur n'importe quel hébergement statique.

## 4. Vérifications

| Commande | Rôle |
|---|---|
| `npm run lint` | qualité du code (ESLint) |
| `npm test` | 92 tests automatiques : règles de validation, création de la demande, parcours dans l'interface, présence et crédits des photos |
| `npm run build` | contrôle TypeScript + compilation de production |
| `npm run verifier` | les trois commandes ci-dessus d'un coup |
| `npm run demo` | démonstration du parcours complet dans Chrome/Edge à 390 px et 1366 px, avec captures dans `docs/captures/` (l'application doit tourner : `npm run dev` dans un autre terminal) |

## 5. Parcours à présenter

0. **La marque** — accueil immersif VANLIFE.BZH (« Voyagez autrement. Vivez la route. »), puis le concept Vanlife.
1. **Découvrir** — le séjour pilote Bretagne Sauvage : durée, public, départ/retour, prix indicatif.
2. **Comprendre** — programme J1 à J5, prix indicatif 1 390 € pour 2, inclus / à prévoir.
3. **Demander** — bouton « Demande » (menu) ou « Faire une demande » : ouverture de la **page de demande** (`#/demande`), puis prénom, e-mail, date de départ. Essayer : demande vide, e-mail `camille@exemple`, date passée.
4. **Vérifier** — récapitulatif (circuit, dates aller/retour, coordonnées), bouton *Modifier*.
5. **Confirmer** — envoi simulé : circuit, date demandée, réservation à confirmer.

## 6. Organisation du code

```
public/medias/              Photos (WebP, 2 tailles : -l grande, -s 800 px) et vidéo (WebM 480p)
src/
├── data/sejour.ts          Contenu du circuit (programme, prix, prestations) — À MODIFIER ICI
├── data/marque.ts          Identité Vanlife : nom, signature, présentation, principes
├── data/medias.ts          Catalogue des photos/vidéo : fichier, texte alternatif, lieu, auteur, licence
├── domain/                 Logique métier, indépendante de l'interface
│   ├── types.ts            Types : Sejour, DemandeSaisie → DemandeValidee → DemandeReservation
│   ├── validation.ts       Règles et messages d'erreur du formulaire
│   └── demande.ts          Création de la demande simulée (date de retour, référence DEMO-…)
├── utils/                  Dates (calculs sans décalage de fuseau) et formats (prix, durée)
├── components/
│   ├── layout/             Bandeau démo, en-tête (menu mobile), accueil immersif, pied de page + crédits
│   ├── sejour/             Concept Vanlife, séjour, programme illustré, prix, galerie
│   ├── demande/            Formulaire, résumé d'erreurs, récapitulatif
│   └── ui/                 Briques réutilisables : bouton, champ, photo, vidéo, légende, section…
├── pages/
│   ├── AccueilPage.tsx     Page d'accueil : marque, séjour, programme, prix, galerie
│   ├── DemandePage.tsx     Page « Demande de réservation » (#/demande), chargée à la demande
│   └── ConfirmationPage.tsx
├── styles/global.css       Charte graphique et responsive (mobile d'abord)
├── utils/navigation.ts      Adresses des pages (#/ , #/demande) et des sections (#programme…)
└── App.tsx                 Choix de l'écran : accueil, page de demande ou confirmation
scripts/demo.mjs            Démonstration automatisée
docs/                       Fiche de restitution et captures d'écran
```

**Modifier l'offre** (prix, programme, prestations) : éditer uniquement `src/data/sejour.ts`.
**Modifier une règle du formulaire** : `src/domain/validation.ts` (les tests indiquent ce qui change).

## 7. Choix techniques

**Navigation** : chaque page a sa propre adresse après le « # » (`#/` accueil, `#/demande` demande).
Le bouton « Précédent » du navigateur fonctionne et aucun réglage d'hébergement n'est nécessaire.
La page de demande est chargée à la demande (fichier séparé), avec un message « Chargement… ».


React 19 + TypeScript (strict) + Vite 6 · police de titres Playfair Display servie localement
(aucun appel à un service externe) · Vitest + Testing Library pour les tests · ESLint · Puppeteer (démo uniquement).

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

## 9. Hors périmètre de cette version

Paiement, comptes utilisateurs, stockage des demandes, disponibilités réelles, envoi d'e-mails,
publication publique, carnet de voyage, gestion interne (cahier des charges § 9.4).

Voir aussi : [`docs/FICHE_RESTITUTION.md`](docs/FICHE_RESTITUTION.md).
