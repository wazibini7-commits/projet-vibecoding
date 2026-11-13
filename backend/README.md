# Backend Vanlife — base de données

PostgreSQL 18 (dans Docker) + Prisma 6. Étape 1 de la feuille de route : base de données seule (l'API arrive à l'étape 2).

## Première installation

Prérequis : Node.js ≥ 20 et **Docker Desktop démarré**.

```bash
cd backend
npm install
cp .env.example .env      # adresse de la base (port 5433)
npm run db:up             # démarre PostgreSQL
npm run db:migrate        # crée les tables
npm run db:seed           # remplit la base (séjour, départs 2027, 3 demandes fictives)
```

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run db:up` / `db:down` | démarrer / arrêter PostgreSQL (les données sont conservées) |
| `npm run db:studio` | explorer la base dans le navigateur (Prisma Studio) |
| `npm run db:migrate` | après une modification de `prisma/schema.prisma` : crée et applique une migration |
| `npm run db:seed` | remplir la base ; peut être relancé sans créer de doublons |
| `npm run db:reset` | **efface tout**, rejoue les migrations et le remplissage |

## Tables

`sejours`, `jours_programme`, `prestations`, `departs` (dates et capacité), `clients`, `demandes`,
`historique_statuts` (traçabilité des changements de statut), `utilisateurs` (administrateurs, étape 5).

Le contenu du séjour est repris de `../src/data/sejour.ts` (source unique). Les départs (chaque samedi
d'avril à octobre 2027, 2 vans) sont une **hypothèse** à valider par Vanlife.

Remarque : la base utilise le port **5433**, car un PostgreSQL local occupe déjà le port 5432.
