import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { CreateUserAccountUseCase } from '@bancaflow/identity';
import { AppModule } from './../../src/app.module';
import { ApiExceptionFilter } from './../../src/shared/errors/api-exception.filter';
import { PrismaService } from './../../src/db/prisma.service';
import { CREATE_USER_ACCOUNT_USE_CASE } from './../../src/modules/identity/identity.tokens';

const PASSWORD = 'Participants@123';
const CODE_A = 'test-part-a';
const CODE_B = 'test-part-b';
const CODES = [CODE_A, CODE_B];

interface CreatedBody {
  bettingAgentId: string;
  partyId: string;
  code: string;
}
interface ListBody {
  data: { id: string; code: string; status: string; name: string | null }[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
interface ErrorBody {
  code?: string;
  message?: string[];
  details?: unknown[];
}
interface DetailBody {
  id: string;
  code: string;
  status: string;
  policy: { type: string; weeklyFixedAmountCents: number | null };
  party: {
    name: string | null;
    nickname: string | null;
    contacts: { phone: string; label: string | null }[];
    address: { neighborhood: string; city: string } | null;
  };
}

/**
 * Prova ponta a ponta o catálogo `/api/participants/betting-agents` em
 * PostgreSQL real: unicidade `(bancaId, code)`, corrida de código, isolamento
 * por tenant, autorização (OWNER/ADMIN criam; USER bloqueado na criação, com
 * list/read read-only) e o alerta confirmável de possível duplicidade.
 */
describe('BettingAgentController — /api/participants/betting-agents (integration, real database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let previousSuffix: string | undefined;

  async function cleanup(): Promise<void> {
    await prisma.client.bettingAgentCompensationPolicy.deleteMany({
      where: {
        bettingAgent: { party: { banca: { codigoBanca: { in: CODES } } } },
      },
    });
    await prisma.client.bettingAgent.deleteMany({
      where: { party: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.partyAddress.deleteMany({
      where: { party: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.partyContact.deleteMany({
      where: { party: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.party.deleteMany({
      where: { banca: { codigoBanca: { in: CODES } } },
    });
    await prisma.client.session.deleteMany({
      where: { userAccount: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.userAccount.deleteMany({
      where: { banca: { codigoBanca: { in: CODES } } },
    });
    await prisma.client.banca.deleteMany({
      where: { codigoBanca: { in: CODES } },
    });
  }

  const hostFor = (codigo: string) => `${codigo}.bancaflow.com.br`;

  function cookieValue(setCookies: string[], name: string): string {
    const found = setCookies.find((c) => c.startsWith(`${name}=`));
    if (!found) {
      throw new Error(`cookie ${name} não encontrado`);
    }
    return found.split(';')[0];
  }

  async function loginAs(codigo: string, username: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor(codigo))
      .send({ username, password: PASSWORD });
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    return setCookies ? cookieValue(setCookies, 'access_token') : undefined;
  }

  function createAgent(
    codigo: string,
    cookie: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post('/api/participants/betting-agents')
      .set('Host', hostFor(codigo))
      .set('Cookie', cookie)
      .send(body);
  }

  const validBody = (over: Record<string, unknown> = {}) => ({
    code: '001',
    policy: { type: 'PERCENTAGE_ON_SALES', percentage: 10 },
    ...over,
  });

  function getDetail(codigo: string, cookie: string, id: string) {
    return request(app.getHttpServer())
      .get(`/api/participants/betting-agents/${id}`)
      .set('Host', hostFor(codigo))
      .set('Cookie', cookie);
  }

  function updateAgent(
    codigo: string,
    cookie: string,
    id: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .patch(`/api/participants/betting-agents/${id}`)
      .set('Host', hostFor(codigo))
      .set('Cookie', cookie)
      .send(body);
  }

  function setStatus(
    codigo: string,
    cookie: string,
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
  ) {
    return request(app.getHttpServer())
      .patch(`/api/participants/betting-agents/${id}/status`)
      .set('Host', hostFor(codigo))
      .set('Cookie', cookie)
      .send({ status });
  }

  beforeAll(async () => {
    previousSuffix = process.env.BANCA_HOST_SUFFIX;
    process.env.BANCA_HOST_SUFFIX = '.bancaflow.com.br';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const createAccount = app.get<CreateUserAccountUseCase>(
      CREATE_USER_ACCOUNT_USE_CASE,
    );

    await cleanup();

    for (const codigo of CODES) {
      await prisma.client.banca.create({
        data: {
          id: randomUUID(),
          codigoBanca: codigo,
          nome: codigo,
          status: 'ACTIVE',
        },
      });
    }
    const bancaA = await prisma.client.banca.findUniqueOrThrow({
      where: { codigoBanca: CODE_A },
    });
    const bancaB = await prisma.client.banca.findUniqueOrThrow({
      where: { codigoBanca: CODE_B },
    });

    async function seed(
      bancaId: string,
      username: string,
      role: 'OWNER' | 'ADMIN' | 'USER',
    ) {
      const created = await createAccount.execute({
        bancaId,
        username,
        name: `${username} Silva`,
        password: PASSWORD,
        role,
      });
      if (created.isFailure) {
        throw new Error(
          `seed ${username} falhou: ${created.errors?.join(',')}`,
        );
      }
    }

    await seed(bancaA.id, 'owner', 'OWNER');
    await seed(bancaA.id, 'admin', 'ADMIN');
    await seed(bancaA.id, 'member', 'USER');
    await seed(bancaB.id, 'ownerb', 'OWNER');
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
    if (previousSuffix === undefined) {
      delete process.env.BANCA_HOST_SUFFIX;
    } else {
      process.env.BANCA_HOST_SUFFIX = previousSuffix;
    }
  });

  afterEach(async () => {
    // Limpa apenas os Cambistas entre casos (mantém bancas/contas).
    await prisma.client.bettingAgentCompensationPolicy.deleteMany({
      where: {
        bettingAgent: { party: { banca: { codigoBanca: { in: CODES } } } },
      },
    });
    await prisma.client.bettingAgent.deleteMany({
      where: { party: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.partyAddress.deleteMany({
      where: { party: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.partyContact.deleteMany({
      where: { party: { banca: { codigoBanca: { in: CODES } } } },
    });
    await prisma.client.party.deleteMany({
      where: { banca: { codigoBanca: { in: CODES } } },
    });
  });

  it('OWNER cria; o mesmo código é permitido em Bancas diferentes', async () => {
    const ownerA = await loginAs(CODE_A, 'owner');
    const ownerB = await loginAs(CODE_B, 'ownerb');

    const a = await createAgent(CODE_A, ownerA!, validBody({ code: '001' }));
    const b = await createAgent(CODE_B, ownerB!, validBody({ code: '001' }));

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect((a.body as CreatedBody).code).toBe('001');
  });

  it('ADMIN cria; código duplicado na MESMA Banca retorna 409', async () => {
    const admin = await loginAs(CODE_A, 'admin');
    const first = await createAgent(CODE_A, admin!, validBody({ code: '077' }));
    expect(first.status).toBe(201);

    const dup = await createAgent(CODE_A, admin!, validBody({ code: '077' }));
    expect(dup.status).toBe(409);
    const dupBody = dup.body as ErrorBody;
    expect(dupBody.code).toBe('PARTICIPANTS.CODE_ALREADY_EXISTS');
    expect(dupBody.message).toContain('PARTICIPANTS.CODE_ALREADY_EXISTS');
  });

  it('preserva zeros à esquerda ("001" nunca vira 1)', async () => {
    const owner = await loginAs(CODE_A, 'owner');
    const created = await createAgent(
      CODE_A,
      owner!,
      validBody({ code: '001' }),
    );
    expect((created.body as CreatedBody).code).toBe('001');

    const list = await request(app.getHttpServer())
      .get('/api/participants/betting-agents?search=001')
      .set('Host', hostFor(CODE_A))
      .set('Cookie', owner!);
    expect((list.body as ListBody).data[0].code).toBe('001');
  });

  it('corrida pelo mesmo código na mesma Banca: exatamente um sucesso', async () => {
    const owner = await loginAs(CODE_A, 'owner');
    const [r1, r2] = await Promise.all([
      createAgent(CODE_A, owner!, validBody({ code: '050' })),
      createAgent(CODE_A, owner!, validBody({ code: '050' })),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('USER é bloqueado na criação (403) mas pode listar e consultar', async () => {
    const owner = await loginAs(CODE_A, 'owner');
    const created = await createAgent(
      CODE_A,
      owner!,
      validBody({ code: '010' }),
    );
    const id = (created.body as CreatedBody).bettingAgentId;

    const member = await loginAs(CODE_A, 'member');
    const blocked = await createAgent(
      CODE_A,
      member!,
      validBody({ code: '011' }),
    );
    expect(blocked.status).toBe(403);

    const list = await request(app.getHttpServer())
      .get('/api/participants/betting-agents')
      .set('Host', hostFor(CODE_A))
      .set('Cookie', member!);
    expect(list.status).toBe(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/participants/betting-agents/${id}`)
      .set('Host', hostFor(CODE_A))
      .set('Cookie', member!);
    expect(detail.status).toBe(200);
  });

  it('isolamento por tenant: Banca B não consulta/lista Cambista da Banca A', async () => {
    const ownerA = await loginAs(CODE_A, 'owner');
    const created = await createAgent(
      CODE_A,
      ownerA!,
      validBody({ code: '099' }),
    );
    const id = (created.body as CreatedBody).bettingAgentId;

    const ownerB = await loginAs(CODE_B, 'ownerb');
    const detail = await request(app.getHttpServer())
      .get(`/api/participants/betting-agents/${id}`)
      .set('Host', hostFor(CODE_B))
      .set('Cookie', ownerB!);
    expect(detail.status).toBe(404);

    const list = await request(app.getHttpServer())
      .get('/api/participants/betting-agents')
      .set('Host', hostFor(CODE_B))
      .set('Cookie', ownerB!);
    expect((list.body as ListBody).data.map((a) => a.id)).not.toContain(id);
  });

  it('alerta de possível duplicidade: sem confirmação 409 com candidatos; com confirmação cria', async () => {
    const owner = await loginAs(CODE_A, 'owner');
    const first = await createAgent(
      CODE_A,
      owner!,
      validBody({
        code: '021',
        name: 'João',
        nickname: 'Jota',
        phones: [{ phone: '(11) 90000-0001', label: 'Celular' }],
      }),
    );
    expect(first.status).toBe(201);

    const dupProbe = await createAgent(
      CODE_A,
      owner!,
      validBody({
        code: '022',
        name: 'João',
        nickname: 'Jota',
        confirmPossibleDuplicate: false,
      }),
    );
    expect(dupProbe.status).toBe(409);
    const probeBody = dupProbe.body as ErrorBody;
    expect(probeBody.code).toBe('PARTICIPANTS.POSSIBLE_DUPLICATE');
    expect(Array.isArray(probeBody.details)).toBe(true);
    expect(probeBody.details!.length).toBeGreaterThan(0);

    // Nada persistido para o código 022 ainda.
    const before = await prisma.client.bettingAgent.count({
      where: { code: '022' },
    });
    expect(before).toBe(0);

    const confirmed = await createAgent(
      CODE_A,
      owner!,
      validBody({
        code: '022',
        name: 'João',
        nickname: 'Jota',
        confirmPossibleDuplicate: true,
      }),
    );
    expect(confirmed.status).toBe(201);
  });

  it('cria sem perfil (só código + política) e persiste política + endereço quando informado', async () => {
    const owner = await loginAs(CODE_A, 'owner');
    const created = await createAgent(
      CODE_A,
      owner!,
      validBody({
        code: '030',
        policy: {
          type: 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES',
          percentage: 5,
          weeklyFixedAmountCents: 50000,
        },
        address: { neighborhood: 'Centro', city: 'São Paulo' },
      }),
    );
    expect(created.status).toBe(201);
    const id = (created.body as CreatedBody).bettingAgentId;

    const detail = await request(app.getHttpServer())
      .get(`/api/participants/betting-agents/${id}`)
      .set('Host', hostFor(CODE_A))
      .set('Cookie', owner!);
    expect(detail.status).toBe(200);
    const detailBody = detail.body as DetailBody;
    expect(detailBody.policy.type).toBe(
      'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES',
    );
    expect(detailBody.policy.weeklyFixedAmountCents).toBe(50000);
    expect(detailBody.party.address!.neighborhood).toBe('Centro');
  });

  describe('PATCH /api/participants/betting-agents/:id (edição de perfil)', () => {
    it('OWNER edita nome/apelido/contatos/endereço; code e política permanecem intactos', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const created = await createAgent(
        CODE_A,
        owner!,
        validBody({
          code: '201',
          name: 'João',
          nickname: 'Jota',
          phones: [{ phone: '(11) 90000-0001', label: 'Celular' }],
          address: { neighborhood: 'Centro', city: 'São Paulo' },
        }),
      );
      const id = (created.body as CreatedBody).bettingAgentId;

      const updated = await updateAgent(CODE_A, owner!, id, {
        name: 'João da Silva',
        nickname: 'Jotinha',
        phones: [
          { phone: '(11) 90000-0001', label: 'Celular novo' },
          { phone: '(21) 98888-7777', label: 'WhatsApp' },
        ],
        address: { neighborhood: 'Vila Nova', city: 'Campinas' },
        code: '999', // aceito no DTO mas descartado — não deve bloquear nem mudar o código
      });
      expect(updated.status).toBe(200);

      const detail = await getDetail(CODE_A, owner!, id);
      const body = detail.body as DetailBody;
      expect(body.code).toBe('201'); // imutável, ignora o valor enviado
      expect(body.party.name).toBe('João da Silva');
      expect(body.party.nickname).toBe('Jotinha');
      expect(body.party.contacts).toHaveLength(2);
      expect(body.party.contacts.find((c) => c.phone === '11900000001')?.label).toBe(
        'Celular novo',
      );
      expect(body.party.address!.neighborhood).toBe('Vila Nova');
      expect(body.party.address!.city).toBe('Campinas');
      expect(body.policy.type).toBe('PERCENTAGE_ON_SALES');
    });

    it('remove o endereço quando omitido na edição', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const created = await createAgent(
        CODE_A,
        owner!,
        validBody({ code: '202', address: { neighborhood: 'Centro', city: 'São Paulo' } }),
      );
      const id = (created.body as CreatedBody).bettingAgentId;

      const updated = await updateAgent(CODE_A, owner!, id, { name: 'Só nome' });
      expect(updated.status).toBe(200);

      const detail = await getDetail(CODE_A, owner!, id);
      expect((detail.body as DetailBody).party.address).toBeNull();
    });

    it('ADMIN edita; USER é bloqueado (403)', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const created = await createAgent(CODE_A, owner!, validBody({ code: '203' }));
      const id = (created.body as CreatedBody).bettingAgentId;

      const admin = await loginAs(CODE_A, 'admin');
      const byAdmin = await updateAgent(CODE_A, admin!, id, { name: 'Editado pelo Admin' });
      expect(byAdmin.status).toBe(200);

      const member = await loginAs(CODE_A, 'member');
      const byUser = await updateAgent(CODE_A, member!, id, { name: 'Não deveria' });
      expect(byUser.status).toBe(403);
    });

    it('isolamento de tenant: Banca B não edita Cambista da Banca A (404)', async () => {
      const ownerA = await loginAs(CODE_A, 'owner');
      const created = await createAgent(CODE_A, ownerA!, validBody({ code: '204' }));
      const id = (created.body as CreatedBody).bettingAgentId;

      const ownerB = await loginAs(CODE_B, 'ownerb');
      const result = await updateAgent(CODE_B, ownerB!, id, { name: 'Invasão' });
      expect(result.status).toBe(404);
    });

    it('rejeita telefone inválido (400) e não persiste alteração parcial', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const created = await createAgent(
        CODE_A,
        owner!,
        validBody({ code: '205', name: 'Original' }),
      );
      const id = (created.body as CreatedBody).bettingAgentId;

      const result = await updateAgent(CODE_A, owner!, id, {
        name: 'Não deveria persistir',
        phones: [{ phone: '123' }],
      });
      expect(result.status).toBe(400);

      const detail = await getDetail(CODE_A, owner!, id);
      expect((detail.body as DetailBody).party.name).toBe('Original');
    });
  });

  describe('PATCH /api/participants/betting-agents/:id/status (ativar/inativar)', () => {
    it('OWNER inativa e reativa; idempotente ao repetir', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const created = await createAgent(CODE_A, owner!, validBody({ code: '301' }));
      const id = (created.body as CreatedBody).bettingAgentId;

      const inactivated = await setStatus(CODE_A, owner!, id, 'INACTIVE');
      expect(inactivated.status).toBe(200);
      expect(((await getDetail(CODE_A, owner!, id)).body as DetailBody).status).toBe('INACTIVE');

      const repeated = await setStatus(CODE_A, owner!, id, 'INACTIVE');
      expect(repeated.status).toBe(200);

      const reactivated = await setStatus(CODE_A, owner!, id, 'ACTIVE');
      expect(reactivated.status).toBe(200);
      expect(((await getDetail(CODE_A, owner!, id)).body as DetailBody).status).toBe('ACTIVE');
    });

    it('ADMIN altera status; USER é bloqueado (403)', async () => {
      const owner = await loginAs(CODE_A, 'owner');
      const created = await createAgent(CODE_A, owner!, validBody({ code: '302' }));
      const id = (created.body as CreatedBody).bettingAgentId;

      const admin = await loginAs(CODE_A, 'admin');
      const byAdmin = await setStatus(CODE_A, admin!, id, 'INACTIVE');
      expect(byAdmin.status).toBe(200);

      const member = await loginAs(CODE_A, 'member');
      const byUser = await setStatus(CODE_A, member!, id, 'ACTIVE');
      expect(byUser.status).toBe(403);
    });

    it('isolamento de tenant: Banca B não altera status de Cambista da Banca A (404)', async () => {
      const ownerA = await loginAs(CODE_A, 'owner');
      const created = await createAgent(CODE_A, ownerA!, validBody({ code: '303' }));
      const id = (created.body as CreatedBody).bettingAgentId;

      const ownerB = await loginAs(CODE_B, 'ownerb');
      const result = await setStatus(CODE_B, ownerB!, id, 'INACTIVE');
      expect(result.status).toBe(404);
    });
  });
});
