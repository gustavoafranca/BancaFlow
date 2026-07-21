import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../../src/app.module';
import { ApiExceptionFilter } from './../../src/shared/errors/api-exception.filter';
import { PrismaService } from './../../src/db/prisma.service';
import { CREATE_USER_ACCOUNT_USE_CASE } from './../../src/modules/identity/identity.tokens';
import type { CreateUserAccountUseCase } from '@bancaflow/identity';

const PASSWORD = 'OwnerPass@123';
const CODES = ['test-farizeu', 'test-botafogo', 'test-sessions'];

/**
 * Integração com banco real: persistência, isolamento por banca e rotação de
 * refresh token. NÃO cobre o rollback atômico multi-repositório (ProvisionBanca),
 * que depende da transação ambiente (AsyncLocalStorage) do Grupo 3 do Tenancy.
 */
describe('Identity (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const bancaIds: Record<string, string> = {};
  let memberUserId: string;

  async function cleanup(): Promise<void> {
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

  let previousSuffix: string | undefined;
  beforeAll(async () => {
    // Determinístico independente do `.env` local (que em dev usa
    // `.localhost`, ver `apps/backend/.env`): mesmo padrão de override de
    // `test/tenancy/tenant-context.e2e-spec.ts`.
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

    // Semeia duas bancas + uma conta OWNER "owner" em cada (mesmo username).
    for (const codigo of CODES) {
      const banca = await prisma.client.banca.create({
        data: {
          id: randomUUID(),
          codigoBanca: codigo,
          nome: codigo,
          status: 'ACTIVE',
        },
      });
      bancaIds[codigo] = banca.id;
      const created = await createAccount.execute({
        bancaId: banca.id,
        username: 'owner',
        name: 'Owner Silva',
        password: PASSWORD,
        role: 'OWNER',
      });
      if (created.isFailure) {
        throw new Error(`seed account failed: ${created.errors?.join(',')}`);
      }
    }

    const member = await createAccount.execute({
      bancaId: bancaIds['test-sessions'],
      username: 'member',
      name: 'Member Silva',
      password: PASSWORD,
      role: 'USER',
    });
    if (member.isFailure) {
      throw new Error(
        `seed member account failed: ${member.errors?.join(',')}`,
      );
    }
    memberUserId = member.instance.userId;

    const admin = await createAccount.execute({
      bancaId: bancaIds['test-sessions'],
      username: 'admin',
      name: 'Admin Silva',
      password: PASSWORD,
      role: 'ADMIN',
    });
    if (admin.isFailure) {
      throw new Error(`seed admin account failed: ${admin.errors?.join(',')}`);
    }
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

  const hostFor = (codigo: string) => `${codigo}.bancaflow.com.br`;

  function cookieValue(setCookies: string[], name: string): string {
    const found = setCookies.find((c) => c.startsWith(`${name}=`));
    if (!found) {
      throw new Error(`cookie ${name} não encontrado`);
    }
    return found.split(';')[0];
  }

  async function login(codigo: string, username: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor(codigo))
      .send({ username, password });
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    return {
      status: res.status,
      body: res.body as {
        userId: string;
        bancaId: string;
        sessionId: string;
        mustChangePassword: boolean;
      },
      accessCookie: setCookies
        ? cookieValue(setCookies, 'access_token')
        : undefined,
      refreshCookie: setCookies
        ? cookieValue(setCookies, 'refresh_token')
        : undefined,
    };
  }

  it('autentica com senha válida e emite cookies host-only', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-farizeu'))
      .send({ username: 'owner', password: PASSWORD });

    expect(res.status).toBe(200);
    const body = res.body as { bancaId: string };
    expect(body.bancaId).toBe(bancaIds['test-farizeu']);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
    expect(cookies.some((c) => /HttpOnly/i.test(c))).toBe(true);
  });

  it('senha inválida retorna 401 genérico', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-farizeu'))
      .send({ username: 'owner', password: 'errada' });
    expect(res.status).toBe(401);
  });

  it('username inexistente retorna 401 (mesma resposta genérica)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-farizeu'))
      .send({ username: 'naoexiste', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('host reservado/ inválido retorna 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', 'api.bancaflow.com.br')
      .send({ username: 'owner', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('isola por banca: mesmo username, login válido resolve a banca do host', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-botafogo'))
      .send({ username: 'owner', password: PASSWORD });
    expect(res.status).toBe(200);
    const body = res.body as { bancaId: string };
    expect(body.bancaId).toBe(bancaIds['test-botafogo']);
    expect(body.bancaId).not.toBe(bancaIds['test-farizeu']);
  });

  it('rotaciona o refresh token e invalida o anterior', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-farizeu'))
      .send({ username: 'owner', password: PASSWORD });
    const firstCookies = login.headers['set-cookie'] as unknown as string[];
    const firstRefresh = firstCookies
      .find((c) => c.startsWith('refresh_token='))!
      .split(';')[0];

    const rotate = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Host', hostFor('test-farizeu'))
      .set('Cookie', firstRefresh);
    expect(rotate.status).toBe(200);

    // Reusar o refresh anterior deve falhar (token rotacionado).
    const reused = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Host', hostFor('test-farizeu'))
      .set('Cookie', firstRefresh);
    expect(reused.status).toBe(401);
  });

  it('senha inválida e username inexistente retornam exatamente a mesma resposta', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-sessions'))
      .send({ username: 'owner', password: 'errada' });
    const wrongUsername = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-sessions'))
      .send({ username: 'naoexiste', password: 'qualquer' });

    expect(wrongPassword.status).toBe(401);
    expect(wrongUsername.status).toBe(401);
    expect(wrongPassword.body).toMatchObject({
      statusCode: 401,
      message: ['IDENTITY.INVALID_CREDENTIALS'],
    });
    expect(wrongUsername.body).toMatchObject({
      statusCode: 401,
      message: ['IDENTITY.INVALID_CREDENTIALS'],
    });
  });

  it('logout revoga a sessão atual; a mesma sessão não funciona mais', async () => {
    const session = await login('test-sessions', 'owner', PASSWORD);
    expect(session.status).toBe(200);

    const logout = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', session.accessCookie!);
    expect(logout.status).toBe(200);

    const afterLogout = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', session.accessCookie!);
    expect(afterLogout.status).toBe(401);
  });

  it('logout-all revoga todas as sessões do usuário, inclusive de outro dispositivo', async () => {
    const deviceA = await login('test-sessions', 'owner', PASSWORD);
    const deviceB = await login('test-sessions', 'owner', PASSWORD);
    expect(deviceA.status).toBe(200);
    expect(deviceB.status).toBe(200);

    const logoutAll = await request(app.getHttpServer())
      .post('/api/auth/logout-all')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', deviceA.accessCookie!);
    expect(logoutAll.status).toBe(200);

    const deviceBAfter = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', deviceB.accessCookie!);
    expect(deviceBAfter.status).toBe(401);
    expect((deviceBAfter.body as { message: string[] }).message).toEqual([
      'IDENTITY.SESSION_REVOKED',
    ]);
  });

  it('lista e revoga sessões individualmente, sem afetar outras sessões da conta', async () => {
    const deviceA = await login('test-sessions', 'owner', PASSWORD);
    const deviceB = await login('test-sessions', 'owner', PASSWORD);

    const list = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', deviceA.accessCookie!);
    expect(list.status).toBe(200);
    const sessions = list.body as {
      sessionId: string;
      isCurrent: boolean;
      expiresAt: string;
    }[];
    expect(sessions.some((s) => s.sessionId === deviceA.body.sessionId)).toBe(
      true,
    );
    expect(sessions.some((s) => s.sessionId === deviceB.body.sessionId)).toBe(
      true,
    );
    // A sessão do próprio `deviceA` (dono da requisição) é a marcada como atual.
    const deviceAEntry = sessions.find(
      (s) => s.sessionId === deviceA.body.sessionId,
    )!;
    const deviceBEntry = sessions.find(
      (s) => s.sessionId === deviceB.body.sessionId,
    )!;
    expect(deviceAEntry.isCurrent).toBe(true);
    expect(deviceBEntry.isCurrent).toBe(false);
    expect(typeof deviceAEntry.expiresAt).toBe('string');
    expect(new Date(deviceAEntry.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );

    const revoke = await request(app.getHttpServer())
      .delete(`/api/auth/sessions/${deviceB.body.sessionId}`)
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', deviceA.accessCookie!);
    expect(revoke.status).toBe(200);

    const deviceBAfter = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', deviceB.accessCookie!);
    expect(deviceBAfter.status).toBe(401);

    const deviceAStillWorks = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', deviceA.accessCookie!);
    expect(deviceAStillWorks.status).toBe(200);
  });

  it('redefinição administrativa exige troca de senha antes de liberar rotas protegidas', async () => {
    // O alvo é `member` (terceiro), nunca o próprio `owner`: desde
    // `enable-tenant-user-administration`, o ator não redefine a própria
    // senha por este endpoint administrativo (autoproteção,
    // `assertAdministrableTarget`) — autosserviço continua em
    // `PATCH /api/auth/password`.
    const owner = await login('test-sessions', 'owner', PASSWORD);
    expect(owner.status).toBe(200);

    const reset = await request(app.getHttpServer())
      .patch('/api/auth/admin/reset-password')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!)
      .send({ targetUserId: memberUserId });
    expect(reset.status).toBe(200);
    const temporaryPassword = (reset.body as { temporaryPassword: string })
      .temporaryPassword;
    expect(typeof temporaryPassword).toBe('string');
    expect(temporaryPassword.length).toBeGreaterThan(0);

    const tempLogin = await login('test-sessions', 'member', temporaryPassword);
    expect(tempLogin.status).toBe(200);
    expect(tempLogin.body.mustChangePassword).toBe(true);

    const blocked = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', tempLogin.accessCookie!);
    expect(blocked.status).toBe(403);
    expect((blocked.body as { message: string[] }).message).toEqual([
      'IDENTITY.MUST_CHANGE_PASSWORD',
    ]);

    // Bug P0 corrigido: a troca VOLUNTÁRIA (`/api/auth/password`) NÃO tem mais
    // `@AllowPasswordChange()` — mesmo enviando a senha temporária correta como
    // `currentPassword`, o endpoint é bloqueado enquanto `mustChangePassword`
    // for `true`. O único caminho de saída é a troca OBRIGATÓRIA dedicada.
    const voluntaryBlocked = await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', tempLogin.accessCookie!)
      .send({ currentPassword: temporaryPassword, newPassword: PASSWORD });
    expect(voluntaryBlocked.status).toBe(403);
    expect((voluntaryBlocked.body as { message: string[] }).message).toEqual([
      'IDENTITY.MUST_CHANGE_PASSWORD',
    ]);

    // Troca OBRIGATÓRIA: recebe SOMENTE `newPassword`, é autorizada por
    // `mustChangePassword == true` no token (não por flag do body), e devolve
    // um novo access token da MESMA sessão já com `mustChangePassword = false`
    // — sem exigir uma segunda chamada a `refresh()` para sair do loop.
    const mandatoryChange = await request(app.getHttpServer())
      .patch('/api/auth/mandatory-password-change')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', tempLogin.accessCookie!)
      .send({ newPassword: PASSWORD });
    expect(mandatoryChange.status).toBe(200);
    expect(
      (mandatoryChange.body as { mustChangePassword: boolean })
        .mustChangePassword,
    ).toBe(false);

    const newAccessCookie = (
      mandatoryChange.headers['set-cookie'] as unknown as string[]
    )
      .find((c) => c.startsWith('access_token='))!
      .split(';')[0];

    // A MESMA sessão, com o token reemitido, já acessa rotas protegidas —
    // sem precisar de um novo login nem de um `refresh()` adicional.
    const unblocked = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', newAccessCookie);
    expect(unblocked.status).toBe(200);

    const finalLogin = await login('test-sessions', 'member', PASSWORD);
    expect(finalLogin.status).toBe(200);
    expect(finalLogin.body.mustChangePassword).toBe(false);
  });

  it('OWNER não pode redefinir a própria senha por este endpoint administrativo (autoproteção)', async () => {
    const owner = await login('test-sessions', 'owner', PASSWORD);
    expect(owner.status).toBe(200);

    const reset = await request(app.getHttpServer())
      .patch('/api/auth/admin/reset-password')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!)
      .send({ targetUserId: owner.body.userId });
    expect(reset.status).toBe(403);
  });

  it('bancaId forjado no body é rejeitado pelo DTO (whitelist); a ação usa exclusivamente o bancaId do token', async () => {
    const owner = await login('test-sessions', 'owner', PASSWORD);
    expect(owner.status).toBe(200);

    // `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` global
    // rejeita qualquer campo fora do DTO — um `bancaId` forjado no body é
    // recusado com 400 antes mesmo de chegar ao caso de uso. A autoridade
    // continua sendo exclusivamente o `bancaId` do token (via @CurrentBancaId).
    const forged = await request(app.getHttpServer())
      .patch(`/api/accounts/${memberUserId}/status`)
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!)
      .send({ action: 'deactivate', bancaId: 'banca-forjada-inexistente' });
    expect(forged.status).toBe(400);

    const deactivate = await request(app.getHttpServer())
      .patch(`/api/accounts/${memberUserId}/status`)
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!)
      .send({ action: 'deactivate' });
    expect(deactivate.status).toBe(200);

    const memberLogin = await login('test-sessions', 'member', PASSWORD);
    expect(memberLogin.status).toBe(401);

    const reactivate = await request(app.getHttpServer())
      .patch(`/api/accounts/${memberUserId}/status`)
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!)
      .send({ action: 'activate' });
    expect(reactivate.status).toBe(200);
  });

  it('regressão P0-1: OWNER/ADMIN autenticado normalmente (mustChangePassword=false) NÃO pode usar a troca OBRIGATÓRIA — 403', async () => {
    // Autorização autoritativa (P0-1): o `MandatoryPasswordChangeUseCase` lê a
    // flag `mustChangePassword` do estado PERSISTIDO da conta, nunca do papel
    // do usuário nem da claim do token. Sem a flag `true`, qualquer conta —
    // inclusive OWNER e ADMIN — é rejeitada com 403 antes de qualquer escrita.
    const owner = await login('test-sessions', 'owner', PASSWORD);
    expect(owner.status).toBe(200);
    expect(owner.body.mustChangePassword).toBe(false);

    const ownerBypass = await request(app.getHttpServer())
      .patch('/api/auth/mandatory-password-change')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!)
      .send({ newPassword: 'OutraSenhaForte@789' });
    expect(ownerBypass.status).toBe(403);
    expect((ownerBypass.body as { message: string[] }).message).toEqual([
      'IDENTITY.FORBIDDEN',
    ]);

    const admin = await login('test-sessions', 'admin', PASSWORD);
    expect(admin.status).toBe(200);
    expect(admin.body.mustChangePassword).toBe(false);

    const adminBypass = await request(app.getHttpServer())
      .patch('/api/auth/mandatory-password-change')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', admin.accessCookie!)
      .send({ newPassword: 'OutraSenhaForte@789' });
    expect(adminBypass.status).toBe(403);
    expect((adminBypass.body as { message: string[] }).message).toEqual([
      'IDENTITY.FORBIDDEN',
    ]);

    // A senha da conta OWNER permanece inalterada (nenhuma escrita ocorreu).
    const stillWorks = await login('test-sessions', 'owner', PASSWORD);
    expect(stillWorks.status).toBe(200);
  });

  it('troca VOLUNTÁRIA de senha: cookie do access token é atualizado com mustChangePassword=false na MESMA resposta', async () => {
    // Prova P0-2: a emissão do novo access token acontece DENTRO da transação
    // do `ChangePasswordUseCase` — o controller apenas seta o cookie a partir
    // do output. O cliente NÃO precisa chamar `/api/auth/refresh` depois.
    const admin = await login('test-sessions', 'admin', PASSWORD);
    expect(admin.status).toBe(200);

    const NEW_PASSWORD = 'NovaSenhaForteAdmin@321';
    const changed = await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', admin.accessCookie!)
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    expect(changed.status).toBe(200);
    expect(
      (changed.body as { mustChangePassword: boolean }).mustChangePassword,
    ).toBe(false);

    const newAccessCookie = (
      changed.headers['set-cookie'] as unknown as string[]
    )
      .find((c) => c.startsWith('access_token='))!
      .split(';')[0];

    // A MESMA sessão, com o token reemitido NA MESMA resposta, já acessa
    // rotas protegidas — sem precisar de refresh() adicional.
    const worksImmediately = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', newAccessCookie);
    expect(worksImmediately.status).toBe(200);

    // A senha antiga não funciona mais; a nova sim.
    const oldPasswordLogin = await login('test-sessions', 'admin', PASSWORD);
    expect(oldPasswordLogin.status).toBe(401);
    const newPasswordLogin = await login(
      'test-sessions',
      'admin',
      NEW_PASSWORD,
    );
    expect(newPasswordLogin.status).toBe(200);

    // Restaura a senha original para não afetar outros testes desta suíte.
    const restore = await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', newAccessCookie)
      .send({ currentPassword: NEW_PASSWORD, newPassword: PASSWORD });
    expect(restore.status).toBe(200);
  });

  it('senha atual incorreta na troca voluntária retorna 400 IDENTITY.CURRENT_PASSWORD_INCORRECT (não 401), sem revogar sessões nem alterar a senha', async () => {
    const owner = await login('test-sessions', 'owner', PASSWORD);
    expect(owner.status).toBe(200);
    const otherDevice = await login('test-sessions', 'owner', PASSWORD);
    expect(otherDevice.status).toBe(200);

    const wrongPassword = await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!)
      .send({
        currentPassword: 'senha-errada',
        newPassword: 'NovaSenhaForte@999',
      });

    expect(wrongPassword.status).toBe(400);
    expect((wrongPassword.body as { message: string[] }).message).toEqual([
      'IDENTITY.CURRENT_PASSWORD_INCORRECT',
    ]);

    // Distinto de qualquer 401 de autenticação: a sessão atual E a outra
    // sessão do mesmo usuário continuam válidas — nada foi revogado.
    const currentStillWorks = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', owner.accessCookie!);
    expect(currentStillWorks.status).toBe(200);
    const otherStillWorks = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Host', hostFor('test-sessions'))
      .set('Cookie', otherDevice.accessCookie!);
    expect(otherStillWorks.status).toBe(200);

    // A senha original continua funcionando (nenhuma escrita ocorreu).
    const loginWithOriginalPassword = await login(
      'test-sessions',
      'owner',
      PASSWORD,
    );
    expect(loginWithOriginalPassword.status).toBe(200);
  });

  it('bloqueia após 5 falhas na janela e mantém 401 mesmo com senha correta', async () => {
    const agent = request(app.getHttpServer());
    for (let i = 0; i < 5; i++) {
      await agent
        .post('/api/auth/login')
        .set('Host', hostFor('test-botafogo'))
        .send({ username: 'owner', password: 'errada' });
    }
    const locked = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', hostFor('test-botafogo'))
      .send({ username: 'owner', password: PASSWORD });
    expect(locked.status).toBe(401);
  });
});
