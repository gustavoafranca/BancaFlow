-- CreateTable
CREATE TABLE "PrismaBootstrap" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrismaBootstrap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bancas" (
    "id" TEXT NOT NULL,
    "codigoBanca" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bancas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bancas_codigoBanca_key" ON "bancas"("codigoBanca");
