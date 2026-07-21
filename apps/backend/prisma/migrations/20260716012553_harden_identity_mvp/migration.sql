-- Endurecimento de Identity/Tenancy (harden-identity-authentication-mvp).
-- Ver design.md decisões 4a, 5, 6 e 11 da change para o racional de cada bloco.

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropIndex
DROP INDEX "sessions_refreshTokenDigest_idx";

-- AlterTable: versionamento otimista (ETag) para compare-and-swap no adapter.
ALTER TABLE "user_accounts" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex: refreshTokenDigest único — suporta o compare-and-swap de
-- rotação (`rotateIfDigestMatches`) e impede reuso/duplicação sob corrida.
CREATE UNIQUE INDEX "sessions_refreshTokenDigest_key" ON "sessions"("refreshTokenDigest");

-- CreateIndex: par (id, bancaId) único em UserAccount — alvo da FK composta
-- abaixo, garantindo no banco que uma sessão só referencia usuário da mesma banca.
CREATE UNIQUE INDEX "user_accounts_id_bancaId_key" ON "user_accounts"("id", "bancaId");

-- AddForeignKey: FK composta (userId, bancaId) -> UserAccount(id, bancaId).
-- Substitui a FK simples por userId; impede no banco (não só na aplicação)
-- que uma Session referencie um UserAccount de outra banca.
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_bancaId_fkey" FOREIGN KEY ("userId", "bancaId") REFERENCES "user_accounts"("id", "bancaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints para os enums de domínio (Prisma não tem `@check` nativo
-- estável multi-provider; aplicados via SQL bruto nesta migration).
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_role_check" CHECK ("role" IN ('OWNER', 'ADMIN', 'USER'));
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'BLOCKED'));
ALTER TABLE "bancas" ADD CONSTRAINT "bancas_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE'));
