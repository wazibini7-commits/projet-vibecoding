# Fiche de restitution — Vanlife « Bretagne Sauvage » · prototype v1.0

> Fiche de la **version 1.0** (prototype 100 % navigateur, envoi simulé), conservée telle quelle pour référence.
> Version actuelle (application avec serveur et base de données) : [`FICHE_RESTITUTION_V2.md`](FICHE_RESTITUTION_V2.md).

**Objet :** parcours de demande de réservation simulée — une page principale et un état de confirmation.
**Lancement :** `npm install` puis `npm run dev` → http://localhost:5173 (détails dans le README).

## Choix d'interface
- **La marque d'abord, l'offre ensuite** : accueil photographique VANLIFE.BZH (« Voyagez autrement. Vivez la
  route. »), concept Vanlife, puis le séjour pilote Bretagne Sauvage, son programme illustré (une photo réelle
  par étape), le prix et une galerie. Le formulaire est sur une **page dédiée** (« Demande »), chargée à la demande. Menu fixe (replié en « Menu » sur smartphone).
- **Photos et vidéo réelles des lieux**, sous licence libre et créditées ; photos d'ambiance signalées comme telles.
- **Statut provisoire toujours visible** : bandeau « Version de démonstration — offre et disponibilités à
  confirmer » sur chaque écran, badges « à confirmer » sur le prix, « envoi simulé » rappelé à 4 endroits.
- **Formulaire en deux temps** : saisie puis récapitulatif vérifiable (dates aller/retour calculées), avec
  *Modifier* ou *Envoyer (simulation)*. Message d'erreur explicite sous chaque champ + résumé cliquable ;
  saisie conservée ; date passée ou incomplète refusée.
- **Mobile d'abord** : en-tête sur une ligne dès 320 px, boutons ≥ 44 px, champs en 16 px, aucun
  débordement horizontal. **Accessibilité** : contrastes WCAG AA, focus clavier visible, lien d'évitement.

## Outils utilisés
React 19 · TypeScript · Vite (application 100 % navigateur, sans serveur) · Vitest + Testing Library
(92 tests) · ESLint · Puppeteer (démonstration automatisée) · Wikimedia Commons (médias) · Claude (assistance à la conception et au code ;
chaque résultat vérifié par les tests, le parcours dans Chrome et la relecture des captures).

## Problème observé pendant les essais et correction
- **Constat :** sur smartphone, après « Envoyer ma demande », la confirmation pouvait s'afficher à
  mi-hauteur : son statut « Demande simulée — réservation à confirmer » était hors de l'écran. Cela
  survenait quand un défilement animé (lien du menu, défilement doux) était encore en cours au moment du clic.
- **Cause :** le défilement doux se poursuivait après le changement d'écran et annulait le retour en haut.
- **Correction :** défilement doux neutralisé pendant le changement d'écran, retour en haut forcé (`App.tsx`).
- **Vérification :** scénario reproduit 5 fois sur 5 avant correction, 0 sur 5 après ; démonstration
  complète (`npm run demo`) rejouée avec succès sur 390 px et 1366 px.
- *Autres corrections issues des essais :* date incomplète (« 14/05/ ») signalée comme vide → message
  « date incomplète » ; prix affiché « 1390 € » (espace invisible) → « 1 390 € » ; contraste insuffisant
  des bordures de champs et du focus clavier.
- **Essai par une autre personne :** *à compléter* — testeur : ……… · difficulté observée : ……… · correction : ………

## Vérifications réalisées
Demande vide, e-mail mal formé, date passée/incomplète, saisie complète → récapitulatif cohérent →
confirmation ; largeurs 320, 390, 768 et 1366 px ; navigation au clavier ; texte agrandi à 200 %.
`npm run lint` : 0 erreur · `npm test` : 92/92 · `npm run build` : OK · `npm run demo` : 58/58 (19 photos chargées).

## Limites restantes
Aucun stockage ni envoi : la référence `DEMO-…` est fictive. Photos libres de droits en attendant les visuels
Vanlife (van réel, partenaires) ; vidéo de qualité modeste (480p, caméra embarquée).
Contrôle de l'e-mail limité au format. Pas de test avec un lecteur d'écran réel. Non publié en ligne.

## Éléments que Vanlife doit confirmer
1. Le **prix** de 1 390 € pour deux et la répartition **inclus / à prévoir**.
2. Les **partenaires et lieux des nuitées**, notamment la nuit « secteur Iroise » (J4).
3. L'**activité nautique** : nature, prestataire, conditions en cas de mauvais temps.
4. Les **dates de départ possibles** (saison, jours, délai minimum) — aujourd'hui : toute date à partir du lendemain.
5. La **suite donnée à une demande** (délai de réponse, canal de contact) et les textes de présentation.
