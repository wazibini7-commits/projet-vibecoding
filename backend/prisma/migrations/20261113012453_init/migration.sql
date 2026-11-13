-- CreateEnum
CREATE TYPE "type_prestation" AS ENUM ('INCLUSE', 'A_PREVOIR');

-- CreateEnum
CREATE TYPE "statut_depart" AS ENUM ('OUVERT', 'COMPLET', 'FERME');

-- CreateEnum
CREATE TYPE "statut_demande" AS ENUM ('RECUE', 'EN_ETUDE', 'CONFIRMEE', 'REFUSEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMIN', 'GESTIONNAIRE');

-- CreateTable
CREATE TABLE "sejours" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "accroche" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "duree_jours" INTEGER NOT NULL,
    "duree_nuits" INTEGER NOT NULL,
    "public" TEXT NOT NULL,
    "nombre_voyageurs" INTEGER NOT NULL,
    "ville_depart" TEXT NOT NULL,
    "ville_retour" TEXT NOT NULL,
    "prix_centimes" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "prix_a_confirmer" BOOLEAN NOT NULL DEFAULT true,
    "elements_a_confirmer" TEXT[],
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sejours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jours_programme" (
    "id" SERIAL NOT NULL,
    "sejour_id" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lieu_nuit" TEXT,
    "distance_km" INTEGER,

    CONSTRAINT "jours_programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestations" (
    "id" SERIAL NOT NULL,
    "sejour_id" TEXT NOT NULL,
    "type" "type_prestation" NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departs" (
    "id" SERIAL NOT NULL,
    "sejour_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "capacite" INTEGER NOT NULL DEFAULT 1,
    "statut" "statut_depart" NOT NULL DEFAULT 'OUVERT',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "consentement_rgpd_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "depart_id" INTEGER NOT NULL,
    "date_retour" DATE NOT NULL,
    "nombre_voyageurs" INTEGER NOT NULL,
    "prix_centimes" INTEGER NOT NULL,
    "message" TEXT,
    "note_interne" TEXT,
    "statut" "statut_demande" NOT NULL DEFAULT 'RECUE',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "mot_de_passe_hash" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'GESTIONNAIRE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_connexion" TIMESTAMP(3),

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_statuts" (
    "id" SERIAL NOT NULL,
    "demande_id" UUID NOT NULL,
    "ancien_statut" "statut_demande",
    "nouveau_statut" "statut_demande" NOT NULL,
    "auteur_id" UUID,
    "commentaire" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_statuts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jours_programme_sejour_id_jour_key" ON "jours_programme"("sejour_id", "jour");

-- CreateIndex
CREATE INDEX "prestations_sejour_id_type_idx" ON "prestations"("sejour_id", "type");

-- CreateIndex
CREATE INDEX "departs_date_idx" ON "departs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "departs_sejour_id_date_key" ON "departs"("sejour_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_reference_key" ON "demandes"("reference");

-- CreateIndex
CREATE INDEX "demandes_statut_idx" ON "demandes"("statut");

-- CreateIndex
CREATE INDEX "demandes_depart_id_idx" ON "demandes"("depart_id");

-- CreateIndex
CREATE INDEX "demandes_client_id_idx" ON "demandes"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE INDEX "historique_statuts_demande_id_idx" ON "historique_statuts"("demande_id");

-- AddForeignKey
ALTER TABLE "jours_programme" ADD CONSTRAINT "jours_programme_sejour_id_fkey" FOREIGN KEY ("sejour_id") REFERENCES "sejours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_sejour_id_fkey" FOREIGN KEY ("sejour_id") REFERENCES "sejours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departs" ADD CONSTRAINT "departs_sejour_id_fkey" FOREIGN KEY ("sejour_id") REFERENCES "sejours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_depart_id_fkey" FOREIGN KEY ("depart_id") REFERENCES "departs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
