-- CreateTable
CREATE TABLE "user_accounts" (
    "id" TEXT NOT NULL,
    "bancaId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "failedLoginWindowStartedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bancaId" TEXT NOT NULL,
    "refreshTokenDigest" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_accounts_bancaId_idx" ON "user_accounts"("bancaId");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_bancaId_normalizedUsername_key" ON "user_accounts"("bancaId", "normalizedUsername");

-- CreateIndex
CREATE INDEX "sessions_refreshTokenDigest_idx" ON "sessions"("refreshTokenDigest");

-- CreateIndex
CREATE INDEX "sessions_userId_bancaId_idx" ON "sessions"("userId", "bancaId");

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_bancaId_fkey" FOREIGN KEY ("bancaId") REFERENCES "bancas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
