import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { NestFactory } from '@nestjs/core';
import { ProvisionBancaUseCase } from '@bancaflow/tenancy';
import { AppModule } from '../../../src/app.module';

interface FarizeuSeedData {
  codigoBanca: string;
  nome: string;
  owner: { username: string; name: string; password: string; email?: string };
}

function loadFarizeuData(): FarizeuSeedData {
  const path = join(__dirname, '..', 'data', 'farizeu.json');
  return JSON.parse(readFileSync(path, 'utf-8')) as FarizeuSeedData;
}

/**
 * Seed único e atômico do fluxo Identity+Tenancy: cria a banca `farizeu` e sua
 * conta `OWNER` na MESMA transação via `ProvisionBancaUseCase` real (composto
 * pelo `AppModule`, com os mesmos adapters usados em produção). Idempotente —
 * não recria se a banca já existir.
 *
 * Senha de desenvolvimento exclusiva, definida em `data/farizeu.json`; nunca
 * reutilizar em outro ambiente.
 */
export async function seedProvisionFarizeu(prisma: PrismaClient): Promise<void> {
  const farizeu = loadFarizeuData();

  const existing = await prisma.banca.findUnique({
    where: { codigoBanca: farizeu.codigoBanca },
  });
  if (existing) {
    console.log(`[seed] banca "${farizeu.codigoBanca}" já existe — nada a fazer`);
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const provisionBanca = app.get(ProvisionBancaUseCase);
    const result = await provisionBanca.execute({
      codigoBanca: farizeu.codigoBanca,
      nome: farizeu.nome,
      owner: farizeu.owner,
    });

    if (result.isFailure) {
      throw new Error(
        `[seed] falha ao provisionar "${farizeu.codigoBanca}": ${result.errors!.join(', ')}`,
      );
    }

    console.log(
      `[seed] banca "${farizeu.codigoBanca}" provisionada — bancaId=${result.instance.bancaId} userId=${result.instance.userId}`,
    );
  } finally {
    await app.close();
  }
}
