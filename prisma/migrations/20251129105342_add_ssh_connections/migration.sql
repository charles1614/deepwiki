-- CreateTable
CREATE TABLE "ssh_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Connection',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "encryptedAuthToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssh_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ssh_connections_userId_idx" ON "ssh_connections"("userId");

-- AddForeignKey
ALTER TABLE "ssh_connections" ADD CONSTRAINT "ssh_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
