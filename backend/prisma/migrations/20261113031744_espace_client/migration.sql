-- CreateEnum
CREATE TYPE "auteur_message" AS ENUM ('CLIENT', 'VANLIFE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "type_email" ADD VALUE 'LIEN_SUIVI';
ALTER TYPE "type_email" ADD VALUE 'MESSAGE_VANLIFE';
ALTER TYPE "type_email" ADD VALUE 'MESSAGE_CLIENT';
ALTER TYPE "type_email" ADD VALUE 'ANNULATION_CLIENT';

-- CreateTable
CREATE TABLE "acces_suivi" (
    "id" TEXT NOT NULL,
    "demande_id" UUID NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acces_suivi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages_demandes" (
    "id" SERIAL NOT NULL,
    "demande_id" UUID NOT NULL,
    "auteur" "auteur_message" NOT NULL,
    "auteur_id" UUID,
    "texte" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_demandes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acces_suivi_demande_id_idx" ON "acces_suivi"("demande_id");

-- CreateIndex
CREATE INDEX "messages_demandes_demande_id_idx" ON "messages_demandes"("demande_id");

-- AddForeignKey
ALTER TABLE "acces_suivi" ADD CONSTRAINT "acces_suivi_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_demandes" ADD CONSTRAINT "messages_demandes_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_demandes" ADD CONSTRAINT "messages_demandes_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
