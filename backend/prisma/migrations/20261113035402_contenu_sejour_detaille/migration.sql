-- AlterTable
ALTER TABLE "jours_programme" ADD COLUMN     "activites" TEXT[],
ADD COLUMN     "duree_route_minutes" INTEGER,
ADD COLUMN     "nuit_a_confirmer" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sejours" ADD COLUMN     "presentation_van" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "questions_frequentes" (
    "id" SERIAL NOT NULL,
    "sejour_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "a_confirmer" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "questions_frequentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipements_van" (
    "id" SERIAL NOT NULL,
    "sejour_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "categorie" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "equipements_van_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_frequentes_sejour_id_idx" ON "questions_frequentes"("sejour_id");

-- CreateIndex
CREATE INDEX "equipements_van_sejour_id_idx" ON "equipements_van"("sejour_id");

-- AddForeignKey
ALTER TABLE "questions_frequentes" ADD CONSTRAINT "questions_frequentes_sejour_id_fkey" FOREIGN KEY ("sejour_id") REFERENCES "sejours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipements_van" ADD CONSTRAINT "equipements_van_sejour_id_fkey" FOREIGN KEY ("sejour_id") REFERENCES "sejours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
