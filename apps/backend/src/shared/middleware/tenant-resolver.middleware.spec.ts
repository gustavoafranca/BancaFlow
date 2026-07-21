import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';

/**
 * Testes de unidade (P1-5 — decisão 11 revisada): a fronteira de confiança de
 * `X-Forwarded-Host` exige DUAS condições: `TRUST_PROXY_HOST=true` E o peer
 * TCP imediato (`req.socket.remoteAddress`) estar em `TRUSTED_PROXY_IPS`. Sem
 * ambas, o middleware ignora o header forjado e usa sempre `Host` direto.
 */
describe('TenantResolverMiddleware', () => {
  function buildConfig(values: Record<string, string>): ConfigService {
    return {
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
    } as unknown as ConfigService;
  }

  function buildRequest(overrides: {
    host?: string;
    forwardedHost?: string;
    remoteAddress?: string;
  }): AuthenticatedRequest {
    return {
      headers: {
        host: overrides.host,
        'x-forwarded-host': overrides.forwardedHost,
      },
      socket: { remoteAddress: overrides.remoteAddress },
    } as unknown as AuthenticatedRequest;
  }

  const NEXT = jest.fn();
  const RES = {} as Response;

  it('usa o Host direto quando TRUST_PROXY_HOST=false, mesmo com X-Forwarded-Host presente', () => {
    const middleware = new TenantResolverMiddleware(
      buildConfig({
        TRUST_PROXY_HOST: 'false',
        TRUSTED_PROXY_IPS: '10.0.0.1',
      }),
    );
    const req = buildRequest({
      host: 'legitima.bancaflow.com.br',
      forwardedHost: 'outra-banca.bancaflow.com.br',
      remoteAddress: '10.0.0.1',
    });

    middleware.use(req, RES, NEXT);

    expect(req.codigoBanca).toBe('legitima');
  });

  it('ignora X-Forwarded-Host quando TRUST_PROXY_HOST=true mas o peer NÃO está na allowlist', () => {
    const middleware = new TenantResolverMiddleware(
      buildConfig({
        TRUST_PROXY_HOST: 'true',
        TRUSTED_PROXY_IPS: '10.0.0.1',
      }),
    );
    const req = buildRequest({
      host: 'legitima.bancaflow.com.br',
      forwardedHost: 'outra-banca.bancaflow.com.br',
      remoteAddress: '203.0.113.99', // peer fora da allowlist
    });

    middleware.use(req, RES, NEXT);

    // O header forjado NUNCA sequestra o tenant: resolve pelo Host real.
    expect(req.codigoBanca).toBe('legitima');
    expect(req.codigoBanca).not.toBe('outra-banca');
  });

  it('ignora X-Forwarded-Host quando TRUSTED_PROXY_IPS está vazia/ausente, mesmo com TRUST_PROXY_HOST=true', () => {
    const middleware = new TenantResolverMiddleware(
      buildConfig({
        TRUST_PROXY_HOST: 'true',
        TRUSTED_PROXY_IPS: '',
      }),
    );
    const req = buildRequest({
      host: 'legitima.bancaflow.com.br',
      forwardedHost: 'outra-banca.bancaflow.com.br',
      remoteAddress: '10.0.0.1',
    });

    middleware.use(req, RES, NEXT);

    expect(req.codigoBanca).toBe('legitima');
  });

  it('honra X-Forwarded-Host quando TRUST_PROXY_HOST=true E o peer está na allowlist', () => {
    const middleware = new TenantResolverMiddleware(
      buildConfig({
        TRUST_PROXY_HOST: 'true',
        TRUSTED_PROXY_IPS: '10.0.0.1,10.0.0.2',
      }),
    );
    const req = buildRequest({
      host: 'nao-deveria-ser-usado.bancaflow.com.br',
      forwardedHost: 'banca-real.bancaflow.com.br',
      remoteAddress: '10.0.0.2',
    });

    middleware.use(req, RES, NEXT);

    expect(req.codigoBanca).toBe('banca-real');
  });

  it('perfil de DEV local: resolve a banca quando o peer é loopback mapeado em IPv6 (P1-B/P2-A)', () => {
    // Cenário real do rewrite do Next dev: o Next (em 127.0.0.1) proxia para o
    // backend preservando o host original em X-Forwarded-Host; o Node reporta o
    // peer loopback frequentemente como `::ffff:127.0.0.1` (socket dual-stack).
    const middleware = new TenantResolverMiddleware(
      buildConfig({
        TRUST_PROXY_HOST: 'true',
        TRUSTED_PROXY_IPS: '127.0.0.1,::1,::ffff:127.0.0.1',
      }),
    );
    const req = buildRequest({
      host: 'localhost:4000',
      forwardedHost: 'farizeu.bancaflow.com.br',
      remoteAddress: '::ffff:127.0.0.1',
    });

    middleware.use(req, RES, NEXT);

    expect(req.codigoBanca).toBe('farizeu');
  });

  it('honra X-Forwarded-Host quando o peer está numa faixa CIDR confiável (P2-A)', () => {
    const middleware = new TenantResolverMiddleware(
      buildConfig({
        TRUST_PROXY_HOST: 'true',
        TRUSTED_PROXY_IPS: '172.18.0.0/16', // rede Docker
      }),
    );
    const req = buildRequest({
      host: 'localhost:4000',
      forwardedHost: 'farizeu.bancaflow.com.br',
      remoteAddress: '172.18.0.7',
    });

    middleware.use(req, RES, NEXT);

    expect(req.codigoBanca).toBe('farizeu');
  });

  it('X-Forwarded-For forjado não interfere — a decisão usa apenas o peer TCP real', () => {
    const middleware = new TenantResolverMiddleware(
      buildConfig({
        TRUST_PROXY_HOST: 'true',
        TRUSTED_PROXY_IPS: '10.0.0.1',
      }),
    );
    const req = {
      headers: {
        host: 'legitima.bancaflow.com.br',
        'x-forwarded-host': 'outra-banca.bancaflow.com.br',
        'x-forwarded-for': '10.0.0.1', // forjado pelo cliente, não é o peer real
      },
      socket: { remoteAddress: '203.0.113.99' }, // peer TCP real, fora da allowlist
    } as unknown as AuthenticatedRequest;

    middleware.use(req, RES, NEXT);

    expect(req.codigoBanca).toBe('legitima');
  });
});
