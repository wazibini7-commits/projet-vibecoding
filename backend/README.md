# Backend Vanlife — API et base de données

Fastify 5 (API HTTP) + PostgreSQL 18 (dans Docker) + Prisma 6 + Nodemailer (e-mails), Mailpit en développement.

## Première installation

Prérequis : Node.js ≥ 20.12 et **Docker Desktop démarré**.

```bash
cd backend
npm install
cp .env.example .env      # adresse de la base (port 5433)
npm run db:up             # démarre PostgreSQL et Mailpit (boîte mail de test)
npm run db:migrate        # crée les tables
npm run db:seed           # remplit la base (séjour, départs 2027, 3 demandes fictives)
npm run dev               # API sur http://localhost:3100 (redémarre à chaque modification)
```

**Premier compte du back-office** (aucun compte n'existe par défaut, donc aucun mot de passe connu) :

```bash
npm run utilisateur:creer -- --email prenom@vanlife.example --nom "Prénom Nom"
# --role GESTIONNAIRE pour un compte limité au traitement des demandes (ADMIN par défaut)
# Le mot de passe (12 caractères minimum) est demandé dans le terminal, sans s'afficher.
# Relancer la commande sur un compte existant remplace son mot de passe et ferme ses sessions.
```

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` / `npm start` | lancer l'API (avec / sans rechargement automatique) |
| `npm test` | 107 tests (API publique, e-mails, espace client, back-office, sécurité), sur une base séparée `vanlife_test` |
| `npm run utilisateur:creer` | créer un compte du back-office, ou réinitialiser son mot de passe |
| `npm run verifier` | contrôle TypeScript + tests |
| `npm run db:up` / `db:down` | démarrer / arrêter PostgreSQL et Mailpit (les données sont conservées) |
| `npm run db:studio` | explorer la base dans le navigateur (Prisma Studio) |
| `npm run db:migrate` | après une modification de `prisma/schema.prisma` : crée et applique une migration |
| `npm run db:seed` | remplir la base ; peut être relancé sans créer de doublons |
| `npm run db:reset` | **efface tout**, rejoue les migrations et le remplissage |

## API

| Méthode | Adresse | Réponse |
|---|---|---|
| GET | `/api/sante` | `{ statut, baseDeDonnees }` — 503 si la base est injoignable |
| GET | `/api/sejours` | séjours publiés (résumé) |
| GET | `/api/sejours/:id` | séjour complet, **au format `Sejour` du frontend** |
| GET | `/api/sejours/:id/departs` | départs à venir : `date`, `dateRetour`, `placesRestantes`, `complet` |
| POST | `/api/demandes` | crée une demande → 201 (référence `VL-AAAA-0001`), 400 / 409 avec `{ erreurs: { champ: message } }` |
| POST | `/api/suivi` | `{ reference, jeton }` (lien personnel) → la demande vue par le client, 404 si lien invalide ou expiré |
| POST | `/api/suivi/lien` | `{ reference, email }` → nouveau lien envoyé **par e-mail** ; réponse 202 identique dans tous les cas |
| POST | `/api/suivi/annuler` | `{ reference, jeton, motif? }` → annulation par le client (demande reçue ou en étude) |
| POST | `/api/suivi/messages` | `{ reference, jeton, texte }` → message à l'équipe Vanlife |

### Back-office (`/api/admin`, connexion obligatoire)

| Méthode | Adresse | Rôle |
|---|---|---|
| POST | `/connexion` · `/deconnexion` | ouvrir / fermer une session (cookie) |
| GET | `/moi` | compte connecté |
| POST | `/mot-de-passe` | changer son mot de passe (ferme ses autres sessions) |
| GET | `/demandes?statut=&recherche=&page=` | liste paginée (25), compteurs par statut |
| GET | `/demandes/export.csv` | export tableur (mêmes filtres) |
| GET | `/demandes/:reference` | détail : client, message, historique, e-mails, statuts possibles |
| POST | `/demandes/:reference/statut` | `{ statut, commentaire?, informerClient }` |
| POST | `/demandes/:reference/messages` | `{ texte }` → réponse au client (e-mail signé du prénom, avec lien de suivi) |
| PUT | `/demandes/:reference/note` | note interne |
| GET | `/sejours/:id/departs` | départs avec remplissage |
| POST · PATCH | `/departs` · `/departs/:id` | créer un départ · capacité, ouvert / complet / fermé — **administrateurs** |

Corps de `POST /api/demandes` : `{ sejourId, prenom, email, dateDepart: "AAAA-MM-JJ", message? }`.

**Règles appliquées**
- Prénom, e-mail, date : **les règles et messages du formulaire** (`../src/domain/validation.ts`), réutilisés tels quels.
- Le serveur vérifie en plus : départ existant et ouvert, places restantes, pas de doublon (même e-mail, même départ).
  Le départ est verrouillé pendant le comptage : deux demandes simultanées ne peuvent pas prendre la même dernière place.
- Une demande refusée ou annulée libère sa place.
- Anti-spam : 10 demandes par minute et par adresse IP. CORS limité au site Vanlife. En-têtes de sécurité (helmet).
- **Espace client par lien personnel** (« lien magique ») : secret de 256 bits envoyé par e-mail, seule son empreinte est
  en base, valable jusqu'à 30 jours après le retour. Chaque e-mail au client contient un nouveau lien. Référence + e-mail
  ne suffisent jamais : ils servent seulement à recevoir un lien **par e-mail** (3 par heure au plus).
- Le secret voyage dans le corps des requêtes (POST), jamais dans une URL : absent des journaux du serveur.

**Sécurité du back-office**
- Mots de passe chiffrés avec **Argon2id** ; 12 caractères minimum. Aucun compte par défaut.
- Session : jeton aléatoire de 256 bits dans un cookie `httpOnly` (illisible par JavaScript), `SameSite=Strict`,
  `Secure` en production (`COOKIE_SECURE=true`). La base ne garde que l'empreinte du jeton. Durée : 10 h.
- Toute modification doit venir du site Vanlife (en-tête `Origin` vérifié) : protection contre la falsification de requête (CSRF).
- Connexion : 5 essais par minute et par adresse IP ; même réponse et même durée que l'e-mail existe ou non.
- Un visiteur non connecté reçoit 401 avant toute autre vérification (il n'apprend rien de l'API).
- Rôles : **administrateur** (tout) et **gestionnaire** (demandes uniquement, départs en lecture).
- Changements de statut contrôlés (`src/domain/admin.ts`) : une demande refusée ou annulée est close ;
  deux personnes ne peuvent pas changer le même statut en même temps (la seconde est prévenue).
- Export CSV protégé contre l'injection de formules dans le tableur.

## E-mails

| E-mail | Destinataire | Quand |
|---|---|---|
| Accusé de réception (référence, dates, prix, « pas encore une réservation ») | le client | à chaque nouvelle demande |
| Notification « nouvelle demande » (coordonnées, message) | l'équipe Vanlife (`EMAIL_EQUIPE`) | à chaque nouvelle demande |
| Changement de statut (en étude, confirmée, refusée, annulée), avec le commentaire de Vanlife | le client | quand Vanlife change le statut et coche « Informer le client », ou quand le client annule |
| Lien de suivi | le client | quand il le redemande (référence + e-mail) |
| Réponse de Vanlife | le client | quand l'équipe répond depuis le back-office |
| Message du client · Annulation par le client | l'équipe Vanlife | depuis l'espace client |

Chaque e-mail au client contient un bouton « Suivre ma demande » (lien personnel). L'adresse du site dans ces liens
vient de `SITE_URL` (par défaut http://localhost:5173).

**En développement, aucun e-mail ne part sur internet** : ils sont capturés par Mailpit → **http://localhost:8025**.

**File d'envoi** (table `emails_sortants`) : les e-mails sont enregistrés dans la même transaction que la demande,
puis envoyés en arrière-plan (immédiatement, puis passage toutes les 15 s).
- Serveur de messagerie en panne → la demande est quand même acceptée ; nouvel essai après 1 min, 5 min, 15 min, 1 h,
  puis abandon (statut `ECHEC`, erreur conservée dans `derniere_erreur`).
- Un e-mail ne peut pas partir deux fois (il est réservé avant l'envoi).
- Chaque e-mail garde une trace : statut, nombre d'essais, date d'envoi (visible dans Prisma Studio).

**En production** : renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` (fournisseur
d'envoi : Brevo, Resend, Mailjet…), `EMAIL_EXPEDITEUR` (adresse d'un domaine vérifié chez ce fournisseur) et
`EMAIL_EQUIPE`. Les valeurs par défaut utilisent le domaine `vanlife.example`, réservé et qui n'appartient à personne.

## Organisation

```
prisma/schema.prisma        tables ; prisma/migrations/ : historique SQL ; prisma/seed.ts : remplissage
src/server.ts               démarrage ; src/app.ts : assemblage (testable sans réseau)
src/routes/                 adresses HTTP et contrôle de forme des requêtes (admin.ts : back-office)
src/auth/                   mots de passe (Argon2id), sessions, liens personnels de suivi
src/services/               règles métier (séjours, départs, demandes, suivi.ts : espace client) ; services/admin/ : back-office
scripts/creer-utilisateur.ts création d'un compte du back-office
src/emails/                 contenu des e-mails (modeles.ts), file d'envoi (file.ts), envoi SMTP
tests/                      tests de l'API (base vanlife_test, « aujourd'hui » fixé au 10/01/2027)
```

## Ports

- Base : **5433** (un PostgreSQL local occupe déjà 5432).
- Mailpit : **1025** (SMTP) et **8025** (interface web).
- API : **3100** (Uptime Kuma occupe déjà 3001 sur cette machine). Modifiable avec `PORT` dans `.env`.
