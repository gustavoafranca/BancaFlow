-- Endurecimento adicional (harden-identity-authentication-mvp, Grupo 5 —
-- desvio 40.3): garante no banco que o contador de falhas de login nunca é
-- negativo, mesmo por escrita direta/SQL que contorne a aplicação. Reversível
-- via `ALTER TABLE "user_accounts" DROP CONSTRAINT "user_accounts_failed_login_attempts_check";`.

ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_failed_login_attempts_check" CHECK ("failedLoginAttempts" >= 0);
