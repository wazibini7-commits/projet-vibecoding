-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_utilisateur_id_idx" ON "sessions"("utilisateur_id");

-- CreateIndex
CREATE INDEX "sessions_expire_le_idx" ON "sessions"("expire_le");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
