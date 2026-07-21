import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { buildCorsOptions } from './../src/config/security.config';

/**
 * Regressão (P0 corrigido no Grupo 4 — desvio 40.5): origem fora da allowlist
 * de CORS deve receber a resposta normalmente (sem cabeçalhos CORS), NUNCA
 * `500`. Antes da correção, `callback(new Error(...))` fazia o Express
 * responder `500` — vazando que a origem foi ativamente rejeitada. Este teste
 * usa `buildCorsOptions` (a mesma função aplicada em `main.ts` via
 * `app.enableCors(...)`) para garantir que o teste exercita o comportamento
 * real de produção, não uma reimplementação.
 */
describe('CORS — regressão de origem não permitida (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(buildCorsOptions(['http://localhost:3000']));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('origem fora da allowlist: status NÃO é 500 e nenhum cabeçalho CORS é emitido', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'https://origem-nao-permitida.example.com');

    expect(res.status).not.toBe(500);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('origem permitida: cabeçalho CORS reflete a origem allowlisted', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });
});
