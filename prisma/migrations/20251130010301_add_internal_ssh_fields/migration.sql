-- AlterTable
ALTER TABLE "ssh_connections" ADD COLUMN     "encryptedInternalPassword" TEXT,
ADD COLUMN     "internalHost" TEXT,
ADD COLUMN     "internalPort" INTEGER,
ADD COLUMN     "internalUsername" TEXT;
