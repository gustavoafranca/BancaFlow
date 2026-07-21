import {
  buildCorsOptions,
  isTrustedPeer,
  resolveCorsOrigins,
  resolveTrustedProxyIps,
  validateSecuritySecrets,
} from './security.config';

const STRONG_A = 'a'.repeat(32);
const STRONG_B = 'b'.repeat(32);

describe('validateSecuritySecrets', () => {
  it('não lança quando ambos os segredos são fortes e diferentes', () => {
    expect(() =>
      validateSecuritySecrets({
        JWT_SECRET: STRONG_A,
        REFRESH_TOKEN_SECRET: STRONG_B,
      }),
    ).not.toThrow();
  });

  it('lança quando JWT_SECRET está ausente', () => {
    expect(() =>
      validateSecuritySecrets({ REFRESH_TOKEN_SECRET: STRONG_B }),
    ).toThrow(/JWT_SECRET.*ausente/i);
  });

  it('lança quando REFRESH_TOKEN_SECRET está ausente', () => {
    expect(() => validateSecuritySecrets({ JWT_SECRET: STRONG_A })).toThrow(
      /REFRESH_TOKEN_SECRET.*ausente/i,
    );
  });

  it('lança quando JWT_SECRET é mais curto que 32 caracteres', () => {
    expect(() =>
      validateSecuritySecrets({
        JWT_SECRET: 'curto-demais',
        REFRESH_TOKEN_SECRET: STRONG_B,
      }),
    ).toThrow(/32 caracteres/);
  });

  it('lança quando REFRESH_TOKEN_SECRET é mais curto que 32 caracteres', () => {
    expect(() =>
      validateSecuritySecrets({
        JWT_SECRET: STRONG_A,
        REFRESH_TOKEN_SECRET: 'curto-demais',
      }),
    ).toThrow(/32 caracteres/);
  });

  it('lança quando os dois segredos são iguais (mesmo sendo fortes)', () => {
    expect(() =>
      validateSecuritySecrets({
        JWT_SECRET: STRONG_A,
        REFRESH_TOKEN_SECRET: STRONG_A,
      }),
    ).toThrow(/diferentes/i);
  });

  it('NUNCA aceita o fallback inseguro `secret` como válido', () => {
    expect(() =>
      validateSecuritySecrets({
        JWT_SECRET: 'secret',
        REFRESH_TOKEN_SECRET: 'secret',
      }),
    ).toThrow();
  });
});

describe('resolveCorsOrigins', () => {
  it('usa http://localhost:3000 como default quando CORS_ORIGINS está ausente', () => {
    expect(resolveCorsOrigins({})).toEqual(['http://localhost:3000']);
  });

  it('faz parsing de lista separada por vírgula, removendo espaços e entradas vazias', () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGINS:
          'https://a.bancaflow.com.br, https://b.bancaflow.com.br,,',
      }),
    ).toEqual(['https://a.bancaflow.com.br', 'https://b.bancaflow.com.br']);
  });
});

describe('buildCorsOptions', () => {
  const options = buildCorsOptions(['https://permitida.bancaflow.com.br']);

  it('permite (callback ok=true) quando não há header Origin (curl, mesma origem)', () => {
    const callback = jest.fn();
    options.origin(undefined, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('permite quando a origem está na allowlist', () => {
    const callback = jest.fn();
    options.origin('https://permitida.bancaflow.com.br', callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('NUNCA propaga Error para origem fora da allowlist — apenas omite os cabeçalhos (callback(null, false))', () => {
    const callback = jest.fn();
    options.origin('https://nao-permitida.example.com', callback);
    expect(callback).toHaveBeenCalledWith(null, false);
    expect(callback).not.toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('resolveTrustedProxyIps', () => {
  it('retorna lista vazia quando TRUSTED_PROXY_IPS está ausente (nenhum peer confiável por padrão)', () => {
    expect(resolveTrustedProxyIps({})).toEqual([]);
  });

  it('retorna lista vazia quando TRUSTED_PROXY_IPS é string vazia', () => {
    expect(resolveTrustedProxyIps({ TRUSTED_PROXY_IPS: '' })).toEqual([]);
  });

  it('faz parsing de lista separada por vírgula, removendo espaços e entradas vazias', () => {
    expect(
      resolveTrustedProxyIps({ TRUSTED_PROXY_IPS: '10.0.0.1, 10.0.0.2,,' }),
    ).toEqual(['10.0.0.1', '10.0.0.2']);
  });
});

describe('isTrustedPeer (P2-A — CIDR + IPv4 mapeado em IPv6)', () => {
  it('retorna false para peer ausente', () => {
    expect(isTrustedPeer(undefined, ['127.0.0.1'])).toBe(false);
  });

  it('retorna false quando a allowlist está vazia (falha fechada)', () => {
    expect(isTrustedPeer('127.0.0.1', [])).toBe(false);
  });

  it('casa IP exato IPv4', () => {
    expect(isTrustedPeer('127.0.0.1', ['127.0.0.1'])).toBe(true);
    expect(isTrustedPeer('10.0.0.9', ['127.0.0.1'])).toBe(false);
  });

  it('normaliza IPv4 mapeado em IPv6 (::ffff:127.0.0.1 ≡ 127.0.0.1)', () => {
    expect(isTrustedPeer('::ffff:127.0.0.1', ['127.0.0.1'])).toBe(true);
  });

  it('casa loopback IPv6 (::1)', () => {
    expect(isTrustedPeer('::1', ['::1'])).toBe(true);
  });

  it('casa faixa CIDR IPv4 (ex.: rede Docker 172.18.0.0/16)', () => {
    expect(isTrustedPeer('172.18.0.5', ['172.18.0.0/16'])).toBe(true);
    expect(isTrustedPeer('172.19.0.5', ['172.18.0.0/16'])).toBe(false);
  });

  it('normaliza IPv4 mapeado em IPv6 também para faixas CIDR', () => {
    expect(isTrustedPeer('::ffff:172.18.0.5', ['172.18.0.0/16'])).toBe(true);
  });

  it('ignora entradas malformadas sem derrubar a checagem', () => {
    expect(isTrustedPeer('127.0.0.1', ['nao-e-ip', '127.0.0.1'])).toBe(true);
    expect(isTrustedPeer('127.0.0.1', ['nao-e-ip'])).toBe(false);
  });

  it('não confia num peer válido fora de qualquer entrada', () => {
    expect(
      isTrustedPeer('203.0.113.10', ['127.0.0.1', '::1', '172.18.0.0/16']),
    ).toBe(false);
  });
});
