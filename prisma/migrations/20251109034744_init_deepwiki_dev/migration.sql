-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wikis" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "wikis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_files" (
    "id" TEXT NOT NULL,
    "wikiId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_versions" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeDescription" TEXT,
    "authorId" TEXT NOT NULL,
    "contentSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wiki_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wikis_slug_key" ON "wikis"("slug");

-- CreateIndex
CREATE INDEX "wiki_files_wikiId_idx" ON "wiki_files"("wikiId");

-- CreateIndex
CREATE INDEX "wiki_files_filename_idx" ON "wiki_files"("filename");

-- CreateIndex
CREATE INDEX "wiki_versions_fileId_idx" ON "wiki_versions"("fileId");

-- CreateIndex
CREATE INDEX "wiki_versions_authorId_idx" ON "wiki_versions"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_versions_fileId_versionNumber_key" ON "wiki_versions"("fileId", "versionNumber");

-- AddForeignKey
ALTER TABLE "wikis" ADD CONSTRAINT "wikis_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_files" ADD CONSTRAINT "wiki_files_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "wikis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_versions" ADD CONSTRAINT "wiki_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "wiki_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_versions" ADD CONSTRAINT "wiki_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
