-- AlterTable
ALTER TABLE "wiki_files" ADD COLUMN "content" TEXT;

-- CreateIndex
CREATE INDEX "wiki_files_contentType_idx" ON "wiki_files"("contentType");
