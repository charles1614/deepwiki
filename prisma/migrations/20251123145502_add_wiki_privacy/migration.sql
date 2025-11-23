-- AlterTable
ALTER TABLE "wikis" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "wikis_isPublic_idx" ON "wikis"("isPublic");
