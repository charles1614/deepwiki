-- AlterTable
ALTER TABLE "wikis" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "wikis_isPublic_idx" ON "wikis"("isPublic");

-- Migration: Add wiki privacy controls for public/private visibility
-- This enables wikis to be marked as public for open access
-- Workflow update: Fixed environment variable access for production deployment
