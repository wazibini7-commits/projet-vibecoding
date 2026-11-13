# Backend Vanlife — API et base de données

Fastify 5 (API HTTP) + PostgreSQL 18 (dans Docker) + Prisma 6.

## Première installation

Prérequis : Node.js ≥ 20.12 et **Docker Desktop démarré**.

```bash
cd backend
npm install
cp .env.example .env      # adresse de la base (port 5433)
npm run db:up             # démarre PostgreSQL
npm run db:migrate        # crée les tables
npm run db:seed           # remplit la base (séjour, départs 2027, 3 demandes fictives)
npm run dev               # API sur http://localhost:3100 (redémarre à chaque modification)
```

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` / `npm start` | lancer l'API (avec / sans rechargement automatique) |
| `npm test` | 38 tests de l'API, sur une base séparée `vanlife_test` |
| `npm run verifier` | contrôle TypeScript + tests |
| `npm run db:up` / `db:down` | démarrer / arrêter PostgreSQL (les données sont conservées) |
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
| POST | `/api/demandes/suivi` | `{ reference, email }` → état et historique de la demande, 404 sinon |

Corps de `POST /api/demandes` : `{ sejourId, prenom, email, dateDepart: "AAAA-MM-JJ", message? }`.

**Règles appliquées**
- Prénom, e-mail, date : **les règles et messages du formulaire** (`../src/domain/validation.ts`), réutilisés tels quels.
- Le serveur vérifie en plus : départ existant et ouvert, places restantes, pas de doublon (même e-mail, même départ).
  Le départ est verrouillé pendant le comptage : deux demandes simultanées ne peuvent pas prendre la même dernière place.
- Une demande refusée ou annulée libère sa place.
- Anti-spam : 10 demandes par minute et par adresse IP. CORS limité au site Vanlife. En-têtes de sécurité (helmet).
- Le suivi passe par un POST pour que l'e-mail n'apparaisse jamais dans l'URL ni dans les journaux.

## Organisation

```
prisma/schema.prisma        tables ; prisma/migrations/ : historique SQL ; prisma/seed.ts : remplissage
src/server.ts               démarrage ; src/app.ts : assemblage (testable sans réseau)
src/routes/                 adresses HTTP et contrôle de forme des requêtes
src/services/               règles métier (séjours, départs, demandes)
tests/                      tests de l'API (base vanlife_test, « aujourd'hui » fixé au 10/01/2027)
```

## Ports

- Base : **5433** (un PostgreSQL local occupe déjà 5432).
- API : **3100** (Uptime Kuma occupe déjà 3001 sur cette machine). Modifiable avec `PORT` dans `.env`.
