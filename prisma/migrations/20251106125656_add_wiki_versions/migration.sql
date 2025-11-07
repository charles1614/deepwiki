-- CreateTable
CREATE TABLE "wiki_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wikiId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeLog" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wiki_versions_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "wikis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wiki_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "wiki_versions_wikiId_idx" ON "wiki_versions"("wikiId");

-- CreateIndex
CREATE INDEX "wiki_versions_userId_idx" ON "wiki_versions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_versions_wikiId_version_key" ON "wiki_versions"("wikiId", "version");
