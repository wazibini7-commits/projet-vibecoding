-- CreateEnum
CREATE TYPE "type_email" AS ENUM ('ACCUSE_RECEPTION', 'NOTIFICATION_VANLIFE', 'CHANGEMENT_STATUT');

-- CreateEnum
CREATE TYPE "statut_email" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'ENVOYE', 'ECHEC');

-- CreateTable
CREATE TABLE "emails_sortants" (
    "id" SERIAL NOT NULL,
    "type" "type_email" NOT NULL,
    "demande_id" UUID,
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "statut" "statut_email" NOT NULL DEFAULT 'EN_ATTENTE',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "prochaine_tentative" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_erreur" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envoye_le" TIMESTAMP(3),

    CONSTRAINT "emails_sortants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emails_sortants_statut_prochaine_tentative_idx" ON "emails_sortants"("statut", "prochaine_tentative");

-- CreateIndex
CREATE INDEX "emails_sortants_demande_id_idx" ON "emails_sortants"("demande_id");

-- AddForeignKey
ALTER TABLE "emails_sortants" ADD CONSTRAINT "emails_sortants_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
