import type { CreateUserAccountUseCase } from '@bancaflow/identity';
import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import 'reflect-metadata';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/db/prisma.service';
import { CREATE_USER_ACCOUNT_USE_CASE } from '../src/modules/identity/identity.tokens';

function assertSafeToSeed(): void {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error(
      `[seed-e2e-playwright] recusado: NODE_ENV="${nodeEnv}" não é "development" nem "test". ` +
        'Este seed é destrutivo (apaga o tenant "pw-e2e" e recria uma conta com senha conhecida) ' +
        'e não deve rodar fora de um ambiente local/de teste.',
    );
  }

  if (process.env.ALLOW_E2E_SEED !== 'true') {
    throw new Error(
      '[seed-e2e-playwright] recusado: defina ALLOW_E2E_SEED=true explicitamente para confirmar ' +
        'que você quer rodar este seed destrutivo contra o DATABASE_URL atual.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL ?? '';
  let host = '';
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    // deixa `host` vazio — cai no `includes` abaixo, que falha fechado.
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `[seed-e2e-playwright] recusado: DATABASE_URL aponta para host "${host || '(inválido)'}", ` +
        'não "localhost"/"127.0.0.1". Este seed só pode rodar contra o Postgres local deste projeto.',
    );
  }
}

const CODIGO = 'pw-e2e';
export const E2E_SEED = {
  codigoBanca: CODIGO,
  username: 'e2euser',
  password: 'E2ePlaywright@123',
};

async function main() {
  assertSafeToSeed();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const prisma = app.get(PrismaService);
    await prisma.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: CODIGO } } },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: CODIGO } },
    });
    await prisma.client.banca.deleteMany({ where: { codigoBanca: CODIGO } });

    const banca = await prisma.client.banca.create({
      data: {
        id: randomUUID(),
        codigoBanca: CODIGO,
        nome: 'Banca Playwright E2E',
        status: 'ACTIVE',
      },
    });

    const createAccount = app.get<CreateUserAccountUseCase>(
      CREATE_USER_ACCOUNT_USE_CASE,
    );
    const result = await createAccount.execute({
      bancaId: banca.id,
      username: E2E_SEED.username,
      name: 'Playwright Owner',
      password: E2E_SEED.password,
      role: 'OWNER',
      mustChangePassword: true,
    });
    if (result.isFailure) {
      throw new Error(
        `seed-e2e-playwright failed: ${result.errors?.join(',')}`,
      );
    }
    console.log(`[seed-e2e-playwright] banca=${banca.id} pronto`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
