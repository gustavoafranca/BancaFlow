import * as ipaddr from 'ipaddr.js';

const MIN_SECRET_LENGTH = 32;

export function validateSecuritySecrets(
  env: Record<string, string | undefined> = process.env,
): void {
  const jwtSecret = env.JWT_SECRET;
  const refreshSecret = env.REFRESH_TOKEN_SECRET;

  const errors: string[] = [];

  if (!jwtSecret) {
    errors.push('JWT_SECRET é obrigatório e está ausente.');
  } else if (jwtSecret.length < MIN_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET deve ter pelo menos ${MIN_SECRET_LENGTH} caracteres (atual: ${jwtSecret.length}).`,
    );
  }

  if (!refreshSecret) {
    errors.push('REFRESH_TOKEN_SECRET é obrigatório e está ausente.');
  } else if (refreshSecret.length < MIN_SECRET_LENGTH) {
    errors.push(
      `REFRESH_TOKEN_SECRET deve ter pelo menos ${MIN_SECRET_LENGTH} caracteres (atual: ${refreshSecret.length}).`,
    );
  }

  if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
    errors.push('JWT_SECRET e REFRESH_TOKEN_SECRET devem ser diferentes.');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuração de segurança inválida no startup:\n- ${errors.join('\n- ')}`,
    );
  }
}

export function resolveCorsOrigins(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const raw = env.CORS_ORIGINS ?? 'http://localhost:3000';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export interface CorsOptionsLike {
  credentials: boolean;
  origin: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => void;
}

export function buildCorsOptions(allowedOrigins: string[]): CorsOptionsLike {
  return {
    credentials: true,
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  };
}

export function resolveTrustedProxyIps(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const raw = env.TRUSTED_PROXY_IPS ?? '';
  return raw
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
}

export function isTrustedPeer(
  peerAddress: string | undefined,
  allowlist: string[],
): boolean {
  if (!peerAddress || allowlist.length === 0) {
    return false;
  }

  let peer: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    peer = ipaddr.process(peerAddress);
  } catch {
    return false;
  }

  return allowlist.some((entry) => {
    try {
      if (entry.includes('/')) {
        const cidr = ipaddr.parseCIDR(entry);
        if (peer.kind() === 'ipv4' && cidr[0].kind() === 'ipv4') {
          return (peer as ipaddr.IPv4).match(cidr as [ipaddr.IPv4, number]);
        }
        if (peer.kind() === 'ipv6' && cidr[0].kind() === 'ipv6') {
          return (peer as ipaddr.IPv6).match(cidr as [ipaddr.IPv6, number]);
        }
        return false;
      }
      const entryAddr = ipaddr.process(entry);
      return (
        peer.kind() === entryAddr.kind() &&
        peer.toNormalizedString() === entryAddr.toNormalizedString()
      );
    } catch {
      return false;
    }
  });
}
