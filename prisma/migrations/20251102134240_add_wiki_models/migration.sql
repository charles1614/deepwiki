-- CreateTable
CREATE TABLE "wikis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "folderName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wiki_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wikiId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wiki_files_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "wikis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "wikis_slug_key" ON "wikis"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "wikis_folderName_key" ON "wikis"("folderName");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_files_filePath_key" ON "wiki_files"("filePath");

-- CreateIndex
CREATE INDEX "wiki_files_wikiId_idx" ON "wiki_files"("wikiId");
