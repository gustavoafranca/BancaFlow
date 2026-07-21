import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedProvisionFarizeu } from './tasks/provision-farizeu.seed';

type SeedTask = (prisma: PrismaClient) => Promise<void>;

const seedTasks: SeedTask[] = [seedProvisionFarizeu];

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run prisma/seed/main.ts');
  }

  for (const task of seedTasks) {
    await task(prisma);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
