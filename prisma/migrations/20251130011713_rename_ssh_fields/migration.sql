/*
  Warnings:

  - You are about to drop the column `encryptedInternalPassword` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `encryptedPassword` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `host` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `internalHost` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `internalPort` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `internalUsername` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `port` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `proxyUrl` on the `ssh_connections` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `ssh_connections` table. All the data in the column will be lost.
  - Added the required column `encryptedWebPassword` to the `ssh_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `webHost` to the `ssh_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `webPort` to the `ssh_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `webUsername` to the `ssh_connections` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ssh_connections" DROP COLUMN "encryptedInternalPassword",
DROP COLUMN "encryptedPassword",
DROP COLUMN "host",
DROP COLUMN "internalHost",
DROP COLUMN "internalPort",
DROP COLUMN "internalUsername",
DROP COLUMN "port",
DROP COLUMN "proxyUrl",
DROP COLUMN "username",
ADD COLUMN     "encryptedSshPassword" TEXT,
ADD COLUMN     "encryptedWebPassword" TEXT NOT NULL,
ADD COLUMN     "sshHost" TEXT,
ADD COLUMN     "sshPort" INTEGER,
ADD COLUMN     "sshUsername" TEXT,
ADD COLUMN     "webHost" TEXT NOT NULL,
ADD COLUMN     "webPort" INTEGER NOT NULL,
ADD COLUMN     "webUsername" TEXT NOT NULL;
