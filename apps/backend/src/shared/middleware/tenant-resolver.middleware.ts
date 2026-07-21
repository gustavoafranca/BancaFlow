import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import {
  isTrustedPeer,
  resolveTrustedProxyIps,
} from '../../config/security.config';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'status']);
const DEFAULT_SUFFIX = '.bancaflow.com.br';

/**
 * Movido de `identity/middleware` para `shared/middleware` (D1 do design.md de
 * `review-web-frontend-architecture`: promoção só com segundo consumidor real)
 * quando `TenancyModule` passou a precisar da mesma resolução de `codigoBanca`
 * por host para o endpoint público `GET /api/tenant-context`.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly suffix: string;
  private readonly trustProxyHost: boolean;
  private readonly trustedProxyIps: string[];

  constructor(config: ConfigService) {
    this.suffix = config.get<string>('BANCA_HOST_SUFFIX', DEFAULT_SUFFIX);
    this.trustProxyHost =
      config.get<string>('TRUST_PROXY_HOST', 'false') === 'true';
    this.trustedProxyIps = resolveTrustedProxyIps({
      TRUSTED_PROXY_IPS: config.get<string>('TRUSTED_PROXY_IPS', ''),
    });
  }

  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    req.codigoBanca = this.resolveCodigoBanca(req);
    next();
  }

  private isFromTrustedProxy(req: AuthenticatedRequest): boolean {
    return isTrustedPeer(req.socket?.remoteAddress, this.trustedProxyIps);
  }

  private resolveCodigoBanca(req: AuthenticatedRequest): string | undefined {
    const honorForwardedHost =
      this.trustProxyHost && this.isFromTrustedProxy(req);
    const rawHost = honorForwardedHost
      ? (this.firstHeader(req.headers['x-forwarded-host']) ?? req.headers.host)
      : req.headers.host;
    if (!rawHost) {
      return undefined;
    }

    const host = rawHost.split(':')[0].trim().toLowerCase();
    if (!host.endsWith(this.suffix)) {
      return undefined;
    }

    const codigo = host.slice(0, host.length - this.suffix.length);
    if (!codigo || codigo.includes('.') || RESERVED_SUBDOMAINS.has(codigo)) {
      return undefined;
    }

    return codigo;
  }

  private firstHeader(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
