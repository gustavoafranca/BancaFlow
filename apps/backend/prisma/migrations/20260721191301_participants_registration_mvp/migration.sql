-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "bancaId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "nameNormalized" TEXT,
    "nickname" TEXT,
    "nicknameNormalized" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_contacts" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_addresses" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "neighborhood" TEXT NOT NULL,
    "neighborhoodNormalized" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityNormalized" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "betting_agents" (
    "id" TEXT NOT NULL,
    "bancaId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "betting_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "betting_agent_compensation_policies" (
    "id" TEXT NOT NULL,
    "bettingAgentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "percentage" DECIMAL(5,2),
    "weeklyFixedAmountCents" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "betting_agent_compensation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parties_bancaId_idx" ON "parties"("bancaId");

-- CreateIndex
CREATE UNIQUE INDEX "parties_bancaId_id_key" ON "parties"("bancaId", "id");

-- CreateIndex
CREATE INDEX "party_contacts_partyId_idx" ON "party_contacts"("partyId");

-- CreateIndex
CREATE INDEX "party_contacts_phone_idx" ON "party_contacts"("phone");

-- CreateIndex
CREATE INDEX "party_addresses_partyId_idx" ON "party_addresses"("partyId");

-- CreateIndex
CREATE INDEX "betting_agents_bancaId_idx" ON "betting_agents"("bancaId");

-- CreateIndex
CREATE UNIQUE INDEX "betting_agents_bancaId_code_key" ON "betting_agents"("bancaId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "betting_agents_bancaId_partyId_key" ON "betting_agents"("bancaId", "partyId");

-- CreateIndex
CREATE INDEX "betting_agent_compensation_policies_bettingAgentId_idx" ON "betting_agent_compensation_policies"("bettingAgentId");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_bancaId_fkey" FOREIGN KEY ("bancaId") REFERENCES "bancas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_contacts" ADD CONSTRAINT "party_contacts_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_addresses" ADD CONSTRAINT "party_addresses_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "betting_agents" ADD CONSTRAINT "betting_agents_bancaId_partyId_fkey" FOREIGN KEY ("bancaId", "partyId") REFERENCES "parties"("bancaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "betting_agent_compensation_policies" ADD CONSTRAINT "betting_agent_compensation_policies_bettingAgentId_fkey" FOREIGN KEY ("bettingAgentId") REFERENCES "betting_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
